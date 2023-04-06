// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {getAccounts} from "@/utils/accounts";

export type AccountType = {
  title: string,
  email: string,
  apiKey: string,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountType[]>
) {
  try {
    const accounts = getAccounts();
    res.status(200).json(accounts.map(({title, email}: AccountType) => ({title, email})) as AccountType[]);
  } catch (e) {
    console.log(e)
    // @ts-ignore
    res.status(500).json({ message: 'An error occurred', error: e });
  }
}
