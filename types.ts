export enum PaymentMethod {
  OUTRIGHT = 'Trả thẳng',
  INSTALLMENT = 'Trả góp',
}

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ',
  OTHER = 'Khác',
}

export enum Role {
  SALESPERSON = 'salesperson',
  MANAGER = 'manager',
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}


export interface Contract {
  id: string;
  contractNumber: string;
  signingDate: string;
  deliveryDate: string;
  
  // Link to user
  salespersonId: string;
  salespersonName: string;

  // Customer Info
  customerName: string;
  customerPhone: string;
  customerDateOfBirth: string;
  customerGender: Gender;
  customerIdNumber: string;
  customerIdIssueDate: string;
  customerIdIssuePlace: string;
  customerAddress: string;

  // Vehicle Info
  vehicleType: string;
  vehicleColor: string;
  vehicleProductionYear: number;
  vehicleVin: string;
  vehicleEngineNumber: string;

  // Contract & Payment Info
  paymentMethod: PaymentMethod;
  sellingPrice: number;
  
  // Promotions
  promo4percent: boolean;
  promo3percent: boolean;
  promoVf3Social: boolean;
  promoInsurance: boolean;
  promoVf3Fixed: boolean;
  promoVf5Fixed: boolean;
  salespersonDiscount: number;
  companyDiscount: number;
  totalDiscount: number;
  finalPrice: number;

  payment1: number;
  payment1Date: string;
  payment2: number;
  payment2Date: string;
  payment3: number;
  payment3Date: string;
}

export interface Vehicle {
  id: string;
  name: string;
  price: number;
  colors: string[];
}
