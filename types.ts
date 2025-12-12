export interface CheckoutFormData {
  fullName: string;
  email: string;
  cpf: string;
  cep: string;
  street: string;
  neighborhood: string;
  houseNumber: string;
  city: string; // Added for completeness based on CEP usually
  state: string; // Added for completeness
  agreedToShipping: boolean;
}

export interface FormErrors {
  [key: string]: string;
}
