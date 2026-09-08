from datetime import datetime, timedelta
from random import Random
from sqlalchemy.orm import Session
from .database import engine
from .models import *
from .security import hash_password
from .services import recalc_order

R=Random(26)

def seed_database():
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        if db.query(User).count() > 0:
            return
        roles=[
            ("farmer@krishimarg.demo","Ramesh Kumar","farmer"),
            ("customer@krishimarg.demo","Ananya Rao","customer"),
            ("buyer@krishimarg.demo","FreshBasket Procurement","buyer"),
            ("driver@krishimarg.demo","Suresh Yadav","driver"),
            ("collection@krishimarg.demo","Meena — Collection Ops","collection"),
            ("package@krishimarg.demo","Rahul — Package Ops","package"),
            ("hub@krishimarg.demo","Kiran — City Hub","hub"),
            ("admin@krishimarg.demo","Krishi Marg Control Tower","admin"),
        ]
        users=[]
        for email,name,role in roles:
            u=User(email=email,password_hash=hash_password("demo123"),name=name,role=role)
            db.add(u); users.append(u)
        db.commit()
        db.refresh(users[0])
        # additional farmers/drivers/customers/buyers for realistic dashboards
        for i in range(2,21):
            u=User(email=f"farmer{i}@demo.local",password_hash=hash_password("demo123"),name=f"Farmer {chr(64+i)}",role="farmer")
            db.add(u)
        for i in range(2,16):
            u=User(email=f"driver{i}@demo.local",password_hash=hash_password("demo123"),name=f"Driver {i}",role="driver")
            db.add(u)
        for i in range(2,11):
            u=User(email=f"customer{i}@demo.local",password_hash=hash_password("demo123"),name=f"Customer {i}",role="customer")
            db.add(u)
        for i in range(2,6):
            u=User(email=f"buyer{i}@demo.local",password_hash=hash_password("demo123"),name=f"B2B Buyer {i}",role="buyer")
            db.add(u)
        db.commit()
        all_farmers=db.query(User).filter(User.role=="farmer").all()
        # crops
        crops=[("Tomato",32),("Onion",28),("Potato",24),("Chilli",55),("Other",30)]
        for name,price in crops: db.add(Produce(name=name,base_price=price))
        db.commit()
        pm={p.name:p for p in db.query(Produce).all()}
        for i,u in enumerate(all_farmers,1):
            lat=17.25+R.random()*.38; lng=78.22+R.random()*.45
            f=Farmer(user_id=u.id,farmer_code=f"KM-FMR-2026-{i:04d}",location=f"Hyderabad Rural {i}",lat=lat,lng=lng,earnings=R.randint(1800,9500))
            db.add(f)
        db.commit()
        farmers=db.query(Farmer).all()
        for i,f in enumerate(farmers):
            crop=["Tomato","Onion","Potato","Chilli"][i%4]
            qty=100+R.randint(0,420)
            harvest=datetime.utcnow()-timedelta(hours=8+R.randint(0,80))
            db.add(ProduceListing(farmer_id=f.id,produce_id=pm[crop].id,quantity=qty,remaining_qty=qty,
                                  expected_grade=["A","A","B"][i%3],harvest_date=harvest,available_date=datetime.utcnow(),
                                  location=f.location,expected_price=pm[crop].base_price))
        # centres
        centres=[
            CollectionCentre(name="Shamshabad Collection Point",location="Shamshabad",lat=17.240, lng=78.429),
            CollectionCentre(name="Medchal Collection Point",location="Medchal",lat=17.629,lng=78.481),
            CollectionCentre(name="Hayathnagar Collection Point",location="Hayathnagar",lat=17.322,lng=78.596)]
        db.add_all(centres)
        packages=[PackageCentre(name="LB Nagar Fresh Pack",location="LB Nagar",lat=17.345,lng=78.552),
                  PackageCentre(name="Jeedimetla Pack House",location="Jeedimetla",lat=17.475,lng=78.450)]
        db.add_all(packages)
        db.add(CityHub(name="Hyderabad City Fresh Hub",location="Kukatpally",lat=17.494,lng=78.399))
        db.commit()
        # vehicles for all drivers
        drivers=db.query(User).filter(User.role=="driver").all()
        types=[("Mini Truck",700,True),("Tata Ace",1000,False),("Reefer Mini",800,True)]
        for i,d in enumerate(drivers):
            t=types[i%3]
            db.add(Vehicle(driver_id=d.id,vehicle_type=t[0],capacity_kg=t[1],temp_capable=t[2],available=True,plate=f"TS09KM{1000+i}"))
        db.commit()
        # customers + demo orders
        customers=db.query(User).filter(User.role=="customer").all()
        base_orders=[
            (customers[0],"Tomato",100,"A/B","Banjara Hills","Tomorrow 9–12 AM"),
            (customers[0],"Tomato",150,"A/B","Gachibowli","Tomorrow 10–1 PM"),
            (customers[1],"Onion",120,"A/B","Madhapur","Tomorrow 2–5 PM"),
            (customers[2],"Potato",180,"B","Kukatpally","Tomorrow 11–2 PM"),
        ]
        for cust,crop,qty,grade,dest,window in base_orders:
            o=Order(customer_id=cust.id,crop=crop,quantity=qty,grade_preference=grade,destination=dest,delivery_window=window,produce_cost=0,logistics_estimate=0,total_estimate=0)
            db.add(o); db.commit(); recalc_order(db,o,"A")
            db.add(Payment(order_id=o.id,amount=o.total_estimate,status="PENDING"))
        # B2B weekly tomato requirement = 500 kg
        buyer=db.query(User).filter(User.role=="buyer").first()
        db.add(BuyerRequirement(buyer_user_id=buyer.id,crop="Tomato",quantity=500,grade="A/B",destination="Hyderabad",cadence="Mon/Wed/Fri"))
        db.commit()
        # lots / shipments for demo
        f=farmers[0]; harvest=datetime.utcnow()-timedelta(hours=18)
        lot=Lot(lot_code="LOT-KM-98231",farmer_id=f.id,crop="Tomato",quantity=420,grade="A",harvest_time=harvest,current_stage="COLLECTION",freshness_score=82,temperature=8.4)
        db.add(lot); db.commit()
        order=db.query(Order).filter(Order.crop=="Tomato").first()
        sh=Shipment(shipment_code="KM-SHP-26001",lot_id=lot.id,order_id=order.id,current_stage="COLLECTION",status="REQUESTED",
                    distance_km=48,duration_min=104,eta="~104 min",current_lat=17.385,current_lng=78.486,freshness_score=82)
        db.add(sh); db.commit()
        # another active shipment
        lot2=Lot(lot_code="LOT-KM-98232",farmer_id=farmers[1].id,crop="Onion",quantity=300,grade="A",harvest_time=datetime.utcnow()-timedelta(hours=30),
                 current_stage="HUB",freshness_score=74,temperature=7.9)
        db.add(lot2); db.commit()
        sh2=Shipment(shipment_code="KM-SHP-26002",lot_id=lot2.id,current_stage="HUB",status="IN_TRANSIT",
                     distance_km=32,duration_min=70,eta="~26 min",current_lat=17.44,current_lng=78.41,freshness_score=74)
        db.add(sh2); db.commit()
        # notifications
        for u in db.query(User).all():
            if u.role in ("customer","farmer","driver"):
                db.add(Notification(user_id=u.id,title="Krishi Marg demo ready",message="This is simulated prototype data for SIH judging.",kind="DEMO"))
        db.commit()
