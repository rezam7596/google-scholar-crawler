// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';
import {getApiKey} from "@/utils/accounts";

type Query = {
  apiEmail?: string,
  apiKey?: string,
}

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
    const { apiEmail, apiKey } = req.query as Query;
    const finalApiKey = getApiKey(apiEmail, apiKey);
    const accountInfo = await getAccountInfo(finalApiKey);
    res.status(200).json(accountInfo);
  } catch (e) {
    // @ts-ignore
    res.status(500).json({ message: 'An error occurred', error: e });
  }
}

async function getAccountInfo(apiKey: string) {
  const { data } = await axios('https://serpapi.com/account', {
    params: {
      api_key: apiKey,
    }
  })
  return data;
}