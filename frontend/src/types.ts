export type Role = 'farmer'|'customer'|'buyer'|'driver'|'collection'|'package'|'hub'|'admin'
export type User = {id:number;email:string;name:string;role:Role}
export type Shipment = {id:number;code:string;lot_id:number;lot_code:string;crop:string;quantity:number;grade:string;status:string;stage:string;driver:string;driver_id?:number;vehicle:string;vehicle_id?:number;distance_km:number;duration_min:number;eta:string;lat:number;lng:number;freshness:number}
