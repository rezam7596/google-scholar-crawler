// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';
import * as xlsx from 'xlsx';

export type Response = {
  "searches_per_month": number,
  "plan_searches_left": number,
  "total_searches_left": number,
  "this_month_usage": number,
  "last_hour_searches": number,
  "account_rate_limit_per_hour": number,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    const accountInfo = await getAccountInfo();
    res.status(200).json(accountInfo);
  } catch (e) {
    // @ts-ignore
    res.status(500).json({ message: 'An error occurred', error: e });
  }
}

async function getAccountInfo() {
  const { data } = await axios('https://serpapi.com/account', {
    params: {
      api_key: '7846c5a6d1babed69b51d57684bb946bc041b1408d5f290885835fb79a5a783b',
    }
  })
  return data;
}