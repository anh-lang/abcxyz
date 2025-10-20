import React, { useState, useEffect, useMemo } from 'react';
import { Contract, PaymentMethod, Gender } from '../types';
import { VEHICLE_DATA } from '../constants';
import { ArrowLeftIcon } from './icons';

type ValidationError = { id: string; field: keyof Contract };

interface ContractFormProps {
  // FIX: Changed onSave to return a Promise to handle async operations.
  onSave: (contract: Contract) => Promise<boolean>;
  onCancel: () => void;
  existingContract?: Contract | null;
  validationErrors: ValidationError[];
  onClearValidationError: (id: string, field: keyof Contract) => void;
}

const getInitialFormData = (contract: Contract | null | undefined): Omit<Contract, 'id'> => {
    if (contract) {
        // Remove id for editing
        const { id, ...rest } = contract;
        return rest;
    }
    return {
        contractNumber: '',
        signingDate: new Date().toISOString().split('T')[0],
        // FIX: Changed 'E' to 'Date' to fix "Cannot find name 'E'" error.
        deliveryDate: new Date().toISOString().split('T')[0],
        
        // Fix: Added missing properties to satisfy Omit<Contract, 'id'> type
        salespersonId: '',
        salespersonName: '',

        customerName: '',
        customerPhone: '',
        customerDateOfBirth: '',
        customerGender: Gender.MALE,
        customerIdNumber: '',
        customerIdIssueDate: '',
        customerIdIssuePlace: '',
        customerAddress: '',
        vehicleType: VEHICLE_DATA[0].name,
        vehicleColor: VEHICLE_DATA[0].colors[0],
        vehicleProductionYear: new Date().getFullYear(),
        vehicleVin: '',
        vehicleEngineNumber: '',
        paymentMethod: PaymentMethod.OUTRIGHT,
        sellingPrice: VEHICLE_DATA[0].price,
        // Promotions
        promo4percent: false,
        promo3percent: false,
        promoVf3Social: false,
        promoInsurance: false,
        promoVf3Fixed: false,
        promoVf5Fixed: false,
        salespersonDiscount: 0,
        companyDiscount: 0,
        totalDiscount: 0,
        finalPrice: VEHICLE_DATA[0].price,
        // Payments
        payment1: 0,
        payment1Date: new Date().toISOString().split('T')[0],
        payment2: 0,
        payment2Date: '',
        payment3: 0,
        payment3Date: '',
    };
};

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-6">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            {children}
        </div>
    </div>
);

const InputField: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; hasError?: boolean; }> = 
({ label, name, value, onChange, type = 'text', required = false, hasError = false }) => {
    const errorClasses = 'border-red-500 ring-2 ring-red-300 animate-pulse';
    const baseClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm";
    return (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-600">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            className={`${baseClasses} ${hasError ? errorClasses : ''}`}
        />
    </div>
)};

const SelectField: React.FC<{label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; hasError?: boolean;}> = ({label, name, value, onChange, children, hasError = false}) => {
    const errorClasses = 'border-red-500 ring-2 ring-red-300 animate-pulse';
    const baseClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm";
    return (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-600">{label}</label>
        <select id={name} name={name} value={value} onChange={onChange} className={`${baseClasses} ${hasError ? errorClasses : ''}`}>
            {children}
        </select>
    </div>
)};

const CheckboxField: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; }> = 
({ label, name, checked, onChange, disabled = false }) => (
  <div className="flex items-center">
    <input
      id={name}
      name={name}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
    />
    <label htmlFor={name} className={`ml-3 block text-sm ${disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700'}`}>{label}</label>
  </div>
);


export const ContractForm: React.FC<ContractFormProps> = ({ onSave, onCancel, existingContract, validationErrors, onClearValidationError }) => {
    const [formData, setFormData] = useState<Omit<Contract, 'id'>>(getInitialFormData(existingContract));
    const [formId] = useState(() => existingContract?.id || `form-new-${Date.now()}`);

    const formErrors = useMemo(() => validationErrors.filter(e => e.id === formId), [validationErrors, formId]);

    const selectedVehicle = useMemo(() => {
        return VEHICLE_DATA.find(v => v.name === formData.vehicleType) || VEHICLE_DATA[0];
    }, [formData.vehicleType]);

    useEffect(() => {
        if (!existingContract || existingContract.vehicleType !== selectedVehicle.name) {
            setFormData(prev => ({
                ...prev,
                sellingPrice: selectedVehicle.price,
                vehicleColor: selectedVehicle.colors.includes(prev.vehicleColor) ? prev.vehicleColor : selectedVehicle.colors[0],
            }));
        }
    }, [selectedVehicle, existingContract]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        onClearValidationError(formId, name as keyof Contract);

        const isNumberInput = type === 'number';
        setFormData(prev => ({
            ...prev,
            [name]: isNumberInput ? parseFloat(value) || 0 : value
        }));
    };
    
    const handlePromotionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked, type } = e.target;
        let updates: Partial<Omit<Contract, 'id'>> = {};

        if (type === 'checkbox') {
            updates[name as keyof Contract] = checked;
            
            // Mutual exclusion logic
            if (name === 'promoVf3Fixed' && checked) {
                updates.promoInsurance = false;
            } else if (name === 'promoVf5Fixed' && checked) {
                updates.promoInsurance = false;
            } else if (name === 'promoInsurance' && checked) {
                updates.promoVf3Fixed = false;
                updates.promoVf5Fixed = false;
            }
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    // FIX: Made handleSubmit async to support the async onSave function.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const contractToSave: Contract = {
            id: formId,
            ...formData,
            totalDiscount: calculatedValues.totalDiscount,
            finalPrice: calculatedValues.finalPrice,
        };
        await onSave(contractToSave);
    };

    const calculatedValues = useMemo(() => {
        const basePrice = formData.sellingPrice;
        const appliedPromos: { name: string, amount: number }[] = [];

        if (formData.promo4percent) {
            const amount = basePrice * 0.04;
            appliedPromos.push({ name: 'Ưu đãi 4% MLTTVN', amount });
        }
        if (formData.promo3percent) {
            const amount = basePrice * 0.03;
            appliedPromos.push({ name: 'Ưu đãi 3% cho Bộ Đội & Công An', amount });
        }
        if (formData.promoVf3Social && ['VF3', 'VF3 nâng cao'].includes(formData.vehicleType)) {
            appliedPromos.push({ name: 'Ưu đãi Xã dành riêng cho VF3', amount: 3000000 });
        }
        if (formData.promoVf3Fixed) {
            appliedPromos.push({ name: 'Giảm 6.5 triệu cho VF3', amount: 6500000 });
        }
        if (formData.promoVf5Fixed) {
            appliedPromos.push({ name: 'Giảm 12 triệu cho VF5', amount: 12000000 });
        }
        if (formData.salespersonDiscount > 0) {
            appliedPromos.push({ name: 'Xin giảm giá vào hoa hồng TVBH', amount: formData.salespersonDiscount });
        }
        if (formData.companyDiscount > 0) {
            appliedPromos.push({ name: 'Xin giảm giá từ công ty', amount: formData.companyDiscount });
        }

        const currentDiscount = appliedPromos.reduce((total, promo) => total + promo.amount, 0);
        const finalCalculatedPrice = basePrice - currentDiscount;

        return { totalDiscount: currentDiscount, finalPrice: finalCalculatedPrice, appliedPromos };
    }, [formData.sellingPrice, formData.promo4percent, formData.promo3percent, formData.promoVf3Social, formData.vehicleType, formData.promoVf3Fixed, formData.promoVf5Fixed, formData.salespersonDiscount, formData.companyDiscount]);


    const totalPayment = useMemo(() => {
        return formData.payment1 + formData.payment2 + formData.payment3;
    }, [formData.payment1, formData.payment2, formData.payment3]);
    
    const hasError = (field: keyof Contract) => formErrors.some(e => e.field === field);
    
    // Promotion visibility conditions
    const isVf3 = ['VF3', 'VF3 nâng cao'].includes(formData.vehicleType);
    const isVf5 = ['VF5 PLUS', 'VF5 PLUS Nâng cao'].includes(formData.vehicleType);
    const canHaveInsurance = isVf3 || isVf5;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-6">
                    <button onClick={onCancel} className="p-2 rounded-full hover:bg-slate-200 transition-colors mr-3 text-slate-600">
                       <ArrowLeftIcon />
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800">
                        {existingContract ? 'Chỉnh sửa Hợp đồng' : 'Thêm mới Hợp đồng'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <FormSection title="Thông tin Hợp đồng">
                        <InputField label="Số hợp đồng" name="contractNumber" value={formData.contractNumber} onChange={handleChange} required hasError={hasError('contractNumber')} />
                        <InputField label="Ngày ký" name="signingDate" value={formData.signingDate} onChange={handleChange} type="date" required />
                        <InputField label="Ngày giao xe" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} type="date" required />
                    </FormSection>

                    <FormSection title="Thông tin Khách hàng">
                        <InputField label="Họ và tên / Tên công ty" name="customerName" value={formData.customerName} onChange={handleChange} required />
                        <InputField label="Điện thoại" name="customerPhone" value={formData.customerPhone} onChange={handleChange} type="tel" required/>
                        <InputField label="Ngày sinh" name="customerDateOfBirth" value={formData.customerDateOfBirth} onChange={handleChange} type="date" />
                        <SelectField label="Giới tính" name="customerGender" value={formData.customerGender} onChange={handleChange}>
                            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </SelectField>
                        <InputField label="Số CCCD/ĐKKD" name="customerIdNumber" value={formData.customerIdNumber} onChange={handleChange} />
                        <InputField label="Ngày cấp" name="customerIdIssueDate" value={formData.customerIdIssueDate} onChange={handleChange} type="date" />
                        <InputField label="Nơi cấp" name="customerIdIssuePlace" value={formData.customerIdIssuePlace} onChange={handleChange} />
                        <div className="lg:col-span-3">
                           <InputField label="Địa chỉ" name="customerAddress" value={formData.customerAddress} onChange={handleChange} />
                        </div>
                    </FormSection>

                    <FormSection title="Thông tin Xe">
                        <SelectField label="Loại xe" name="vehicleType" value={formData.vehicleType} onChange={handleChange}>
                             {VEHICLE_DATA.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                        </SelectField>
                        <SelectField label="Màu xe" name="vehicleColor" value={formData.vehicleColor} onChange={handleChange}>
                            {selectedVehicle.colors.map(c => <option key={c} value={c}>{c}</option>)}
                        </SelectField>
                         <InputField label="Năm sản xuất" name="vehicleProductionYear" value={formData.vehicleProductionYear} onChange={handleChange} type="number" />
                         <InputField label="Số khung" name="vehicleVin" value={formData.vehicleVin} onChange={handleChange} hasError={hasError('vehicleVin')} />
                         <InputField label="Số máy" name="vehicleEngineNumber" value={formData.vehicleEngineNumber} onChange={handleChange} hasError={hasError('vehicleEngineNumber')} />
                    </FormSection>

                    <FormSection title="Thông tin Thanh toán">
                        <div className="flex items-center space-x-6">
                             <div className="flex items-center">
                                <input id="outright" name="paymentMethod" type="radio" value={PaymentMethod.OUTRIGHT} checked={formData.paymentMethod === PaymentMethod.OUTRIGHT} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="outright" className="ml-2 block text-sm text-slate-800">{PaymentMethod.OUTRIGHT}</label>
                            </div>
                             <div className="flex items-center">
                                <input id="installment" name="paymentMethod" type="radio" value={PaymentMethod.INSTALLMENT} checked={formData.paymentMethod === PaymentMethod.INSTALLMENT} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="installment" className="ml-2 block text-sm text-slate-800">{PaymentMethod.INSTALLMENT}</label>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-6 mt-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-600">Giá niêm yết</label>
                                <p className="mt-1 text-lg font-semibold text-slate-900">{formData.sellingPrice.toLocaleString('vi-VN')} VNĐ</p>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-600">Tổng giảm giá</label>
                                <p className="mt-1 text-lg font-semibold text-red-600">{calculatedValues.totalDiscount.toLocaleString('vi-VN')} VNĐ</p>
                                {calculatedValues.appliedPromos.length > 0 && (
                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <h5 className="text-xs font-semibold text-slate-600 mb-2">Chi tiết ưu đãi:</h5>
                                        <ul className="text-xs text-slate-500 space-y-1">
                                            {calculatedValues.appliedPromos.map((promo, index) => (
                                                <li key={index} className="flex justify-between items-center">
                                                    <span className="truncate pr-2">- {promo.name}</span>
                                                    <span className="font-medium text-slate-700 whitespace-nowrap">- {promo.amount.toLocaleString('vi-VN')} VNĐ</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-600">Giá bán cuối cùng</label>
                                <p className="mt-1 text-lg font-bold text-indigo-700">{calculatedValues.finalPrice.toLocaleString('vi-VN')} VNĐ</p>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 border-t border-slate-200 pt-6 mt-1 space-y-4">
                            <h4 className="text-base font-semibold text-slate-700">Chương trình Khuyến mãi</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                <CheckboxField label="Ưu đãi 4% MLTTVN" name="promo4percent" checked={formData.promo4percent} onChange={handlePromotionChange} />
                                <CheckboxField label="Ưu đãi 3% cho Bộ Đội & Công An" name="promo3percent" checked={formData.promo3percent} onChange={handlePromotionChange} />
                                {isVf3 && <CheckboxField label="Ưu đãi Xã dành riêng cho VF3" name="promoVf3Social" checked={formData.promoVf3Social} onChange={handlePromotionChange} />}
                                {canHaveInsurance && <CheckboxField label="Tặng bảo hiểm 2 năm" name="promoInsurance" checked={formData.promoInsurance} onChange={handlePromotionChange} />}
                                {isVf3 && <CheckboxField label="Giảm 6.5 triệu cho VF3" name="promoVf3Fixed" checked={formData.promoVf3Fixed} onChange={handlePromotionChange} />}
                                {isVf5 && <CheckboxField label="Giảm 12 triệu cho VF5" name="promoVf5Fixed" checked={formData.promoVf5Fixed} onChange={handlePromotionChange} />}
                                
                                <InputField label="Xin giảm giá vào hoa hồng TVBH (VNĐ)" name="salespersonDiscount" value={formData.salespersonDiscount} onChange={handleChange} type="number" />
                                <InputField label="Xin giảm giá từ công ty (VNĐ)" name="companyDiscount" value={formData.companyDiscount} onChange={handleChange} type="number" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Ngày TT lần 1" name="payment1Date" value={formData.payment1Date} onChange={handleChange} type="date" />
                            <InputField label="Tiền TT lần 1" name="payment1" value={formData.payment1} onChange={handleChange} type="number" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Ngày TT lần 2" name="payment2Date" value={formData.payment2Date} onChange={handleChange} type="date" />
                            <InputField label="Tiền TT lần 2" name="payment2" value={formData.payment2} onChange={handleChange} type="number" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Ngày TT lần 3" name="payment3Date" value={formData.payment3Date} onChange={handleChange} type="date" />
                            <InputField label="Tiền TT lần 3" name="payment3" value={formData.payment3} onChange={handleChange} type="number" />
                        </div>
                        
                        <div className="md:col-span-2 lg:col-span-3 flex justify-end items-center mt-4 pt-4 border-t border-slate-200">
                            <span className="text-slate-600 mr-4">Tổng thanh toán:</span>
                            <span className="text-xl font-bold text-indigo-600">{totalPayment.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                    </FormSection>

                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onCancel} className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            disabled={formErrors.length > 0}
                            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
                        >
                            Lưu Hợp đồng
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
