const fs = require('fs');

const FILE_ADDRESS = './accounts-data.txt';

export type AccountType = {
  title: string,
  email: string,
  apiKey: string,
};

export function getAccounts() {
  try {
    const data = fs.readFileSync(FILE_ADDRESS, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.log('Error:', e);
    return [];
  }
}

export function getApiKey(apiEmail: string | undefined, apiKey: string | undefined) {
  if (apiKey) return apiKey;
  const accounts = getAccounts();
  const selectedAccount = accounts.find((account: AccountType) => account.email === apiEmail)
  return selectedAccount?.apiKey || accounts[0]?.apiKey;
}

export function addAccount(newAccount: AccountType) {
  console.log('fileAddress', FILE_ADDRESS);
  const accounts = getAccounts();
  const accountExists = accounts.some((item: AccountType) => item.email === newAccount.email);
  if (accountExists) {
    return;
  }
  accounts.push(newAccount);
  writeAccounts(accounts);
}

export function removeAccount(account: AccountType) {
  const newAccounts = getAccounts().filter((item: AccountType) => item.email !== account.email);
  writeAccounts(newAccounts);
}

function writeAccounts(accounts: AccountType[]) {
  try {
    fs.writeFileSync(FILE_ADDRESS, JSON.stringify(accounts, null, 2));
  } catch (e) {
    console.log('Error:', e);
  }
}