from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Order, User, Produce, Notification, Payment
from ..schemas import OrderIn
from ..security import current_user, require_roles
from ..services import recalc_order, make_notification

router = APIRouter()

@router.post("", dependencies=[Depends(require_roles("customer","buyer","admin"))])
def create_order(data: OrderIn, db: Session = Depends(get_db), user=Depends(current_user)):
    p = db.query(Produce).filter(Produce.name.ilike(data.crop)).first()
    base = p.base_price if p else 30
    order = Order(customer_id=user.id, crop=data.crop.title(), quantity=data.quantity, grade_preference=data.grade_preference,
                  destination=data.destination, delivery_window=data.delivery_window, produce_cost=data.quantity*base,
                  logistics_estimate=150+data.quantity*.9, total_estimate=0)
    db.add(order); db.commit(); db.refresh(order)
    recalc_order(db, order, "A")
    db.add(Payment(order_id=order.id, amount=order.total_estimate, status="PENDING"))
    make_notification(db, user.id, "Order confirmed", f"{order.quantity:g} kg {order.crop} has entered demand aggregation.")

    # Notify all Collection Centres and Package Centres of upcoming harvest demand
    cc_pc_users = db.query(User).filter(User.role.in_(["collection", "package"])).all()
    for cp in cc_pc_users:
        make_notification(db, cp.id, "Upcoming Demand Alert 📋", f"New pre-order registered: {order.quantity:g} kg {order.crop} for delivery {order.delivery_window}. CC and PC demand aggregation updated.", "DEMAND")

    db.commit()
    return order_out(order)

@router.get("")
def get_orders(db: Session = Depends(get_db), user=Depends(current_user)):
    q = db.query(Order)
    if user.role in ("customer", "buyer"):
        user_orders = q.filter(Order.customer_id==user.id).order_by(Order.created_at.desc()).all()
        if user_orders:
            return [order_out(o) for o in user_orders]
    rows = q.order_by(Order.created_at.desc()).all()
    return [order_out(o) for o in rows]

@router.get("/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    o = db.get(Order, order_id)
    if not o: raise HTTPException(404, "Order not found")
    if user.role=="customer" and o.customer_id != user.id: raise HTTPException(403, "Not your order")
    return order_out(o)

def order_out(o):
    return {"id":o.id,"crop":o.crop,"quantity":o.quantity,"grade_preference":o.grade_preference,"destination":o.destination,
            "delivery_window":o.delivery_window,"produce_cost":o.produce_cost,"logistics_estimate":o.logistics_estimate,
            "total_estimate":o.total_estimate,"status":o.status,"created_at":o.created_at.isoformat()}
