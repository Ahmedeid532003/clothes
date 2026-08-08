export const initialSuppliers = Array.from({ length: 20 }, (_, i) => {
  const types = ["مكتب", "مصنع", "مكتب + مصنع"];
  const discountValues = ["5000", "25850", "15000", "12000"];
  return {
    id: `supp-${i + 1}`,
    name: `المورد ${i + 1}`,
    type: types[i % types.length],
    phone: `01${Math.floor(100000000 + Math.random() * 900000000)}`,
    whatsapp: `01${Math.floor(100000000 + Math.random() * 900000000)}`,
    inventoryDay: `1/2/2026`,
    address: `شارع ${i + 1}, مدينة التصنيع`,
    contactPerson: `مندوب ${i + 1}`,
    checkName: discountValues[i % discountValues.length],
    departments: i % 3 === 0 ? ["حريمى", "رجالى"] : ["اطفال"],
    groupId: ["grp-1", "grp-2", "grp-3", "grp-4"][i % 4],
    balance: Math.floor(Math.random() * 100000)
  };
});
