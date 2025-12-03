export const cleanUndefinedValues = (obj: any) => {
  /* 
      Elimina las propiedades con valor undefined y las transforma a null
    */
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) {
      obj[key] = null;
    }
  });
  return obj;
};
