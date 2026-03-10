
export const maskCurrency = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (!v) return '';
  const options = { minimumFractionDigits: 2 };
  const result = new Intl.NumberFormat('pt-BR', options).format(
    parseFloat(v) / 100
  );
  return 'R$ ' + result;
};

export const parseCurrency = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return digits ? parseFloat(digits) / 100 : 0;
};

export const maskCpfCnpj = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    v = v.substring(0, 14);
    return v
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

export const maskCPF = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.substring(0, 11);
  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};
