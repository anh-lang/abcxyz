import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Contract, Gender, PaymentMethod, User, Role } from '../types'; // Import User and Role
import { PlusIcon, SearchIcon, EditIcon, DeleteIcon } from './icons';
import { VEHICLE_DATA, ALL_VEHICLE_COLORS } from '../constants';

type ValidationError = { id: string; field: keyof Contract };

interface ContractListProps {
  contracts: Contract[];
  currentUser: User; // Add currentUser prop
  onAddNew: () => void;
  onEdit: (contract: Contract) => void;
  onDelete: (id: string) => void;
  // FIX: Changed onSaveNew to return a Promise to handle async operations.
  onSaveNew: (contract: Contract) => Promise<boolean>;
  onUpdateField: (id: string, field: keyof Contract, value: any) => void;
  validationErrors: ValidationError[];
  onClearValidationError: (id: string, field: keyof Contract) => void;
}

const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return '0 VNĐ';
    return `${value.toLocaleString('vi-VN')} VNĐ`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    // Format to YYYY-MM-DD for input[type=date] compatibility
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const formatDateForDisplay = (dateString: string) => {
     if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
}


const initialFilterState = {
    vehicleType: '',
    vehicleColor: '',
    vehicleProductionYear: '',
    customerGender: '',
    signingDateFrom: '',
    signingDateTo: '',
    deliveryDateFrom: '',
    deliveryDateTo: ''
};

const getNewContractTemplate = (): Omit<Contract, 'salespersonId' | 'salespersonName'> => ({
    id: `new-${Date.now()}`,
    contractNumber: '',
    signingDate: formatDate(new Date().toISOString()),
    deliveryDate: formatDate(new Date().toISOString()),
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
    payment1Date: formatDate(new Date().toISOString()),
    payment2: 0,
    payment2Date: '',
    payment3: 0,
    payment3Date: '',
});


const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        {children}
    </div>
);

export const ContractList: React.FC<ContractListProps> = ({ contracts, currentUser, onAddNew, onEdit, onDelete, onSaveNew, onUpdateField, validationErrors, onClearValidationError }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState(initialFilterState);
    const [editingCell, setEditingCell] = useState<{ rowId: string; column: keyof Contract } | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newContract, setNewContract] = useState<Omit<Contract, 'salespersonId' | 'salespersonName'>>(getNewContractTemplate());
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    const isManager = currentUser.role === Role.MANAGER;

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    const productionYears = useMemo(() => 
        [...new Set(contracts.map(c => c.vehicleProductionYear))].sort((a, b) => Number(b) - Number(a)), 
    [contracts]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setSearchTerm('');
    };
    
    const handleSave = (rowId: string, column: keyof Contract, value: any) => {
        onUpdateField(rowId, column, value);
        setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowId: string, column: keyof Contract) => {
        if (e.key === 'Enter') {
            handleSave(rowId, column, (e.target as HTMLInputElement).value);
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };
    
    const handleCellDoubleClick = (rowId: string, column: keyof Contract) => {
        const canEdit = isManager || contracts.find(c => c.id === rowId)?.salespersonId === currentUser.id;
        if (canEdit && column !== 'salespersonName') {
             setEditingCell({ rowId, column });
        }
    };

    const handleStartAddNew = () => {
        if (isManager) return;
        setIsAddingNew(true);
        setNewContract(getNewContractTemplate());
    };

    const handleCancelAddNew = () => {
        setIsAddingNew(false);
        // Clear any validation errors associated with the cancelled new contract
        onClearValidationError(newContract.id, 'contractNumber');
        onClearValidationError(newContract.id, 'vehicleVin');
        onClearValidationError(newContract.id, 'vehicleEngineNumber');
    };

    // FIX: Made function async to await the onSaveNew promise.
    const handleSaveNewContract = async () => {
        if (isManager) return;

        if (!newContract.customerName || !newContract.contractNumber) {
            alert('Vui lòng nhập ít nhất Số hợp đồng và Tên khách hàng.');
            return;
        }

        const contractWithUser = {
            ...newContract,
            salespersonId: currentUser.id, // This is just for calculation, parent adds it fully
            salespersonName: currentUser.displayName,
        };

        const basePrice = contractWithUser.sellingPrice;
        let currentDiscount = 0;
        if (contractWithUser.promo4percent) currentDiscount += basePrice * 0.04;
        if (contractWithUser.promo3percent) currentDiscount += basePrice * 0.03;
        if (contractWithUser.promoVf3Fixed) currentDiscount += 6500000;
        if (contractWithUser.promoVf5Fixed) currentDiscount += 12000000;
        currentDiscount += contractWithUser.salespersonDiscount || 0;
        currentDiscount += contractWithUser.companyDiscount || 0;
        
        const finalCalculatedPrice = basePrice - currentDiscount;

        const contractToSave = {
            ...contractWithUser,
            totalDiscount: currentDiscount,
            finalPrice: finalCalculatedPrice
        };

        const wasSaved = await onSaveNew(contractToSave as Contract);
        if (wasSaved) {
            setIsAddingNew(false);
        }
    };
    
    const handleNewContractChange = (field: keyof Omit<Contract, 'salespersonId' | 'salespersonName'>, value: any) => {
        // Clear validation error for this field as the user is typing
        onClearValidationError(newContract.id, field);

        const updatedContract = { ...newContract, [field]: value };
        if (field === 'vehicleType') {
            const vehicle = VEHICLE_DATA.find(v => v.name === value);
            if (vehicle) {
                updatedContract.sellingPrice = vehicle.price;
                updatedContract.vehicleColor = vehicle.colors[0];
            }
        }
        setNewContract(updatedContract);
    };

    const renderEditableCell = (contract: Contract, column: keyof Contract) => {
        const isEditing = editingCell?.rowId === contract.id && editingCell?.column === column;
        const hasError = validationErrors.some(e => e.id === contract.id && e.field === column);

        if (!isEditing) {
            const value = contract[column];
            let displayValue: any = value;
             if (['signingDate', 'deliveryDate', 'customerDateOfBirth', 'customerIdIssueDate', 'payment1Date', 'payment2Date', 'payment3Date'].includes(column)) {
                displayValue = formatDateForDisplay(value as string);
            } else if (['sellingPrice', 'totalDiscount', 'finalPrice', 'payment1', 'payment2', 'payment3'].includes(column)) {
                displayValue = formatCurrency(value as number);
            }
            return <span className={hasError ? 'text-red-600 font-bold' : ''}>{displayValue}</span>;
        }
        
        const value = contract[column];
        const errorClasses = 'border-red-500 ring-2 ring-red-300 animate-pulse';
        
        const commonProps = {
            // Fix: Cast `value` to a type compatible with `defaultValue` prop.
            // This is safe because boolean fields are not made editable in the table.
            defaultValue: value as string | number,
            onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => handleSave(contract.id, column, e.target.value),
            onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => handleKeyDown(e, contract.id, column),
            className: `w-full p-1 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 ${hasError ? errorClasses : ''}`,
            autoFocus: true,
        };

        if (['signingDate', 'deliveryDate', 'customerDateOfBirth', 'customerIdIssueDate', 'payment1Date', 'payment2Date', 'payment3Date'].includes(column)) {
             return <input type="date" {...commonProps} defaultValue={formatDate(value as string)} />;
        }
        
        if (column === 'vehicleType') {
            return (
                <select {...commonProps}>
                    {VEHICLE_DATA.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
            );
        }
        
        if (column === 'vehicleColor') {
             const selectedVehicle = VEHICLE_DATA.find(v => v.name === contract.vehicleType) || VEHICLE_DATA[0];
             return (
                <select {...commonProps}>
                    {selectedVehicle.colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             );
        }
        
         if (column === 'customerGender') {
            return (
                <select {...commonProps}>
                    {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            );
        }

        if (column === 'paymentMethod') {
            return (
                 <select {...commonProps}>
                    {Object.values(PaymentMethod).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            )
        }

        const isNumberField = ['sellingPrice', 'totalDiscount', 'finalPrice', 'payment1', 'payment2', 'payment3', 'vehicleProductionYear'].includes(column);

        return <input type={isNumberField ? "number" : "text"} {...commonProps} />;
    };

    const filteredContracts = useMemo(() => {
        return contracts.filter(contract => {
            const matchesSearch = Object.values(contract).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            );

            const matchesVehicleType = !filters.vehicleType || contract.vehicleType === filters.vehicleType;
            const matchesVehicleColor = !filters.vehicleColor || contract.vehicleColor === filters.vehicleColor;
            const matchesProductionYear = !filters.vehicleProductionYear || contract.vehicleProductionYear.toString() === filters.vehicleProductionYear;
            const matchesGender = !filters.customerGender || contract.customerGender === filters.customerGender;
            
            const signingDate = contract.signingDate ? new Date(contract.signingDate) : null;
            if (signingDate) signingDate.setHours(0,0,0,0);

            const matchesSigningDateFrom = !filters.signingDateFrom || (signingDate && signingDate >= new Date(filters.signingDateFrom));
            const matchesSigningDateTo = !filters.signingDateTo || (signingDate && signingDate <= new Date(filters.signingDateTo));
            
            const deliveryDate = contract.deliveryDate ? new Date(contract.deliveryDate) : null;
            if (deliveryDate) deliveryDate.setHours(0,0,0,0);
            
            const matchesDeliveryDateFrom = !filters.deliveryDateFrom || (deliveryDate && deliveryDate >= new Date(filters.deliveryDateFrom));
            const matchesDeliveryDateTo = !filters.deliveryDateTo || (deliveryDate && deliveryDate <= new Date(filters.deliveryDateTo));
            
            return matchesSearch && matchesVehicleType && matchesVehicleColor && matchesProductionYear && matchesGender && matchesSigningDateFrom && matchesSigningDateTo && matchesDeliveryDateFrom && matchesDeliveryDateTo;
        });
    }, [contracts, searchTerm, filters]);
    
    const renderNewContractRow = () => {
        if (isManager) return null;

        const selectedVehicle = VEHICLE_DATA.find(v => v.name === newContract.vehicleType) || VEHICLE_DATA[0];
        const hasErrorsForNewContract = validationErrors.some(e => e.id === newContract.id);
        const getErrorClass = (field: keyof Contract) => validationErrors.some(e => e.id === newContract.id && e.field === field) 
            ? 'border-red-500 ring-2 ring-red-300 animate-pulse' 
            : 'border-slate-300';
        
        const totalPayment = newContract.payment1 + newContract.payment2 + newContract.payment3;
        
        return (
            <tr className="bg-indigo-50">
                <td className="px-3 py-3 border-r border-slate-200"></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="text" value={newContract.contractNumber} onChange={e => handleNewContractChange('contractNumber', e.target.value)} className={`w-full p-1 border rounded ${getErrorClass('contractNumber')}`} /></td>
                {isManager && <td className="px-3 py-3 border-r border-slate-200 bg-slate-100 text-slate-500 text-sm">{currentUser.displayName}</td>}
                <td className="px-1 py-1 border-r border-slate-200"><input type="text" value={newContract.customerName} onChange={e => handleNewContractChange('customerName', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="tel" value={newContract.customerPhone} onChange={e => handleNewContractChange('customerPhone', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="date" value={newContract.customerDateOfBirth} onChange={e => handleNewContractChange('customerDateOfBirth', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><select value={newContract.customerGender} onChange={e => handleNewContractChange('customerGender', e.target.value)} className="w-full p-1 border rounded">{Object.values(Gender).map(g=><option key={g} value={g}>{g}</option>)}</select></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="text" value={newContract.customerIdNumber} onChange={e => handleNewContractChange('customerIdNumber', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="date" value={newContract.customerIdIssueDate} onChange={e => handleNewContractChange('customerIdIssueDate', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="text" value={newContract.customerIdIssuePlace} onChange={e => handleNewContractChange('customerIdIssuePlace', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="text" value={newContract.customerAddress} onChange={e => handleNewContractChange('customerAddress', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><select value={newContract.vehicleType} onChange={e => handleNewContractChange('vehicleType', e.target.value)} className="w-full p-1 border rounded">{VEHICLE_DATA.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}</select></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={newContract.vehicleProductionYear} onChange={e => handleNewContractChange('vehicleProductionYear', Number(e.target.value))} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><select value={newContract.vehicleColor} onChange={e => handleNewContractChange('vehicleColor', e.target.value)} className="w-full p-1 border rounded">{selectedVehicle.colors.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="text" value={newContract.vehicleVin} onChange={e => handleNewContractChange('vehicleVin', e.target.value)} className={`w-full p-1 border rounded ${getErrorClass('vehicleVin')}`} /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="text" value={newContract.vehicleEngineNumber} onChange={e => handleNewContractChange('vehicleEngineNumber', e.target.value)} className={`w-full p-1 border rounded ${getErrorClass('vehicleEngineNumber')}`} /></td>
                <td className="px-1 py-1 border-r border-slate-200"><select value={newContract.paymentMethod} onChange={e => handleNewContractChange('paymentMethod', e.target.value)} className="w-full p-1 border rounded">{Object.values(PaymentMethod).map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="date" value={newContract.signingDate} onChange={e => handleNewContractChange('signingDate', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="date" value={newContract.deliveryDate} onChange={e => handleNewContractChange('deliveryDate', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200 text-sm font-semibold">{formatCurrency(newContract.sellingPrice)}</td>
                <td className="px-1 py-1 border-r border-slate-200 text-sm font-semibold text-red-600">N/A</td>
                <td className="px-1 py-1 border-r border-slate-200 text-sm font-bold text-indigo-700">N/A</td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="date" value={newContract.payment1Date} onChange={e => handleNewContractChange('payment1Date', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={newContract.payment1} onChange={e => handleNewContractChange('payment1', Number(e.target.value))} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="date" value={newContract.payment2Date} onChange={e => handleNewContractChange('payment2Date', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={newContract.payment2} onChange={e => handleNewContractChange('payment2', Number(e.target.value))} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="date" value={newContract.payment3Date} onChange={e => handleNewContractChange('payment3Date', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={newContract.payment3} onChange={e => handleNewContractChange('payment3', Number(e.target.value))} className="w-full p-1 border rounded" /></td>
                <td className="px-1 py-1 border-r border-slate-200 text-sm font-bold text-indigo-600">{formatCurrency(totalPayment)}</td>
                <td className="px-1 py-1 border-r border-slate-200 text-sm font-semibold text-green-600">{`${(newContract.sellingPrice > 0 ? (totalPayment / newContract.sellingPrice) * 100 : 0).toFixed(2)}%`}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={handleSaveNewContract} 
                          disabled={hasErrorsForNewContract}
                          className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-100 transition-colors disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed" 
                          title="Lưu"
                        >
                          Lưu
                        </button>
                        <button 
                          onClick={handleCancelAddNew} 
                          className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" 
                          title="Hủy"
                        >
                          Hủy
                        </button>
                    </div>
                </td>
            </tr>
        )
    }

    const tableColumns = useMemo(() => {
        const columns: { key: keyof Contract, header: string, isCustomer?: boolean, isVehicle?: boolean, isContract?: boolean, isPayment?: boolean }[] = [];
        if (isManager) {
            columns.push({ key: 'salespersonName', header: 'Nhân viên bán hàng'});
        }
        columns.push(
            { key: 'customerName', header: 'Họ và tên/Tên công ty', isCustomer: true},
            { key: 'customerPhone', header: 'Điện thoại', isCustomer: true },
            { key: 'customerDateOfBirth', header: 'Ngày sinh', isCustomer: true },
            { key: 'customerGender', header: 'Giới tính', isCustomer: true },
            { key: 'customerIdNumber', header: 'Số CMND/ĐKKD', isCustomer: true },
            { key: 'customerIdIssueDate', header: 'Ngày cấp', isCustomer: true },
            { key: 'customerIdIssuePlace', header: 'Nơi cấp', isCustomer: true },
            { key: 'customerAddress', header: 'Địa chỉ', isCustomer: true },
            { key: 'vehicleType', header: 'Model', isVehicle: true },
            { key: 'vehicleProductionYear', header: 'Năm sản xuất', isVehicle: true },
            { key: 'vehicleColor', header: 'Màu sắc', isVehicle: true },
            { key: 'vehicleVin', header: 'Số Khung', isVehicle: true },
            { key: 'vehicleEngineNumber', header: 'Số máy', isVehicle: true },
            { key: 'paymentMethod', header: 'Hình thức mua', isContract: true },
            { key: 'signingDate', header: 'Ngày ký', isContract: true },
            { key: 'deliveryDate', header: 'Ngày giao xe', isContract: true },
            { key: 'sellingPrice', header: 'Giá niêm yết', isPayment: true },
            { key: 'totalDiscount', header: 'Tổng giảm giá', isPayment: true },
            { key: 'finalPrice', header: 'Giá cuối cùng', isPayment: true },
            { key: 'payment1Date', header: 'Ngày L1', isPayment: true },
            { key: 'payment1', header: 'Tiền L1', isPayment: true },
            { key: 'payment2Date', header: 'Ngày L2', isPayment: true },
            { key: 'payment2', header: 'Tiền L2', isPayment: true },
            { key: 'payment3Date', header: 'Ngày L3', isPayment: true },
            { key: 'payment3', header: 'Tiền L3', isPayment: true },
        );
        return columns;
    }, [isManager]);
    
    const colSpans = {
        customer: 8 + (isManager ? 1 : 0),
        vehicle: 5,
        contract: 3,
        payment: 11
    }

    const totalColumns = 2 + tableColumns.length + 2 + 1; // STT, SỐ HĐ, ...columns, Tổng TT, Tỷ lệ, Thao Tác

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-full mx-auto">
                <div className="sm:flex sm:items-center sm:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Quản lý Hợp đồng</h1>
                        <p className="mt-1 text-sm text-slate-500">
                           {isManager ? "Xem và quản lý hợp đồng của tất cả nhân viên." : "Xem, tìm kiếm và quản lý các hợp đồng của bạn."}
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-4">
                         <div className="relative flex-grow sm:flex-grow-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder="Tìm kiếm hợp đồng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm"
                            />
                        </div>
                        {!isManager && (
                          <button
                              onClick={onAddNew}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform hover:scale-105"
                          >
                              <PlusIcon />
                              <span className="ml-2 hidden sm:inline">Thêm mới Hợp đồng</span>
                              <span className="sm:hidden">Thêm mới</span>
                          </button>
                        )}
                    </div>
                </div>

                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-700 mb-3">Bộ lọc nâng cao</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        <FilterField label="Model xe">
                            <select name="vehicleType" value={filters.vehicleType} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm">
                                <option value="">Tất cả Model</option>
                                {VEHICLE_DATA.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                            </select>
                        </FilterField>
                        <FilterField label="Màu sắc">
                            <select name="vehicleColor" value={filters.vehicleColor} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm">
                                <option value="">Tất cả màu</option>
                                {ALL_VEHICLE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </FilterField>
                        <FilterField label="Năm sản xuất">
                             <select name="vehicleProductionYear" value={filters.vehicleProductionYear} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm">
                                <option value="">Tất cả các năm</option>
                                {productionYears.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </FilterField>
                        <FilterField label="Giới tính">
                            <select name="customerGender" value={filters.customerGender} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm">
                                <option value="">Tất cả</option>
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </FilterField>
                        <FilterField label="Ngày ký (từ)">
                            <input type="date" name="signingDateFrom" value={filters.signingDateFrom} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm"/>
                        </FilterField>
                        <FilterField label="Ngày ký (đến)">
                             <input type="date" name="signingDateTo" value={filters.signingDateTo} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm"/>
                        </FilterField>
                        <FilterField label="Ngày giao (từ)">
                             <input type="date" name="deliveryDateFrom" value={filters.deliveryDateFrom} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm"/>
                        </FilterField>
                        <FilterField label="Ngày giao (đến)">
                            <input type="date" name="deliveryDateTo" value={filters.deliveryDateTo} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 sm:text-sm"/>
                        </FilterField>
                        <div className="flex items-end">
                             <button onClick={handleResetFilters} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                </div>


                <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th rowSpan={2} className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-r border-slate-200 whitespace-nowrap">STT</th>
                                    <th rowSpan={2} className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-r border-slate-200 whitespace-nowrap">Số HĐ</th>
                                    <th colSpan={colSpans.customer} className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-r border-slate-200">Thông tin Khách hàng</th>
                                    <th colSpan={colSpans.vehicle} className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-r border-slate-200">Thông tin Xe bán</th>
                                    <th colSpan={colSpans.contract} className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-r border-slate-200">Thông tin Hợp đồng</th>
                                    <th colSpan={colSpans.payment} className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-r border-slate-200">Thông tin Thanh toán</th>
                                    <th rowSpan={2} className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Thao tác</th>
                                </tr>
                                <tr className="text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    {tableColumns.map(c => <th key={c.key} className="px-3 py-3 border-b border-r border-slate-200 whitespace-nowrap">{c.header}</th>)}
                                    <th className="px-3 py-3 border-b border-r border-slate-200 whitespace-nowrap">Tổng đã TT</th>
                                    <th className="px-3 py-3 border-b border-r border-slate-200 whitespace-nowrap">Tỷ lệ nộp</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredContracts.length > 0 ? (
                                    filteredContracts.map((contract, index) => {
                                        const totalPayment = contract.payment1 + contract.payment2 + contract.payment3;
                                        const paymentRatio = contract.finalPrice > 0 ? (totalPayment / contract.finalPrice) * 100 : 0;
                                        const hasError = (field: keyof Contract) => validationErrors.some(e => e.id === contract.id && e.field === field);
                                        const canEdit = isManager || contract.salespersonId === currentUser.id;
                                        return (
                                        <tr key={contract.id} className="hover:bg-slate-50 transition-colors duration-200">
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-500 border-r border-slate-200">{index + 1}</td>
                                            <td onDoubleClick={() => handleCellDoubleClick(contract.id, 'contractNumber')} className={`px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-200 ${hasError('contractNumber') ? 'bg-red-50' : ''}`}>{renderEditableCell(contract, 'contractNumber')}</td>
                                            {tableColumns.map(col => (
                                                <td key={col.key} onDoubleClick={() => handleCellDoubleClick(contract.id, col.key)} className={`px-3 py-3 whitespace-nowrap text-sm text-slate-600 border-r border-slate-200 ${hasError(col.key) ? 'bg-red-50' : ''} ${col.key === 'salespersonName' ? 'bg-slate-50 font-medium' : ''}`}>
                                                    {col.key === 'salespersonName' ? contract.salespersonName : renderEditableCell(contract, col.key)}
                                                </td>
                                            ))}
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-indigo-600 font-bold border-r border-slate-200">{formatCurrency(totalPayment)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-green-600 font-semibold border-r border-slate-200">{`${paymentRatio.toFixed(2)}%`}</td>
                                            {/* Actions */}
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-500">
                                              {canEdit && (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => onEdit(contract)} className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-100 transition-colors duration-200" title="Chỉnh sửa chi tiết">
                                                        <EditIcon />
                                                    </button>
                                                    <button onClick={() => onDelete(contract.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition-colors duration-200" title="Xóa">
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                              )}
                                            </td>
                                        </tr>
                                    )})
                                ) : (
                                    <tr>
                                        <td colSpan={totalColumns} className="text-center py-16 text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="w-12 h-12 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="font-semibold">Không tìm thấy hợp đồng nào.</p>
                                                <p className="text-sm">Hãy thử điều chỉnh lại bộ lọc hoặc tìm kiếm.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                             <tfoot className="border-t-2 border-slate-300">
                                {!isManager && (
                                  isAddingNew ? renderNewContractRow() : (
                                  <tr>
                                      <td colSpan={totalColumns} className="p-2 text-left">
                                          <button onClick={handleStartAddNew} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                                             <PlusIcon />
                                             <span className="ml-2">Thêm mới hợp đồng nhanh</span>
                                          </button>
                                      </td>
                                  </tr>
                                  )
                                )}
                            </tfoot>
                        </table>
                    </div>
                </div>
                 <p className="mt-4 text-sm text-slate-500 text-center">
                    Gợi ý: Nhấn đúp vào một ô để chỉnh sửa nhanh.
                </p>
            </div>
        </div>
    );
};
