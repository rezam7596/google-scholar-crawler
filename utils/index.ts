export function downloadBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.setAttribute('download', fileName); //or any other extension
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

export type AccountType = {
  title: string,
  email: string,
  apiKey: string,
};

export const accounts = [{
  title: 'Ali baba',
  email: 'jeribox897@gpipes.com',
  apiKey: '7846c5a6d1babed69b51d57684bb946bc041b1408d5f290885835fb79a5a783b',
},{
  title: 'Reyhane Pourasgari',
  email: 'r.pourasgari97@gmail.com',
  apiKey: '8401477c96f60ffd28df3470f4a0f66cf3d35a0190724e2792cc52c3af3a22eb',
}]
