import Head from 'next/head'
import React from "react";
import styles from '@/styles/Home.module.css'
import axios from "axios";
import { Response as GoogleScholarApiResponse } from './api/google-scholar';
import { Response as AccountInfoApiResponse } from './api/account-info';
import Loading from "@/components/Loading";
import ExportExcel from "@/components/ExportExcel";
import {accounts} from "@/utils";
import SelectAccount from "@/components/SelectAccount";

export default function Home() {
  const [query, setQuery] = React.useState('');
  const [accountInfo, setAccountInfo] = React.useState<AccountInfoApiResponse | null>(null);
  const [selectedAccount, setSelectedAccount] = React.useState<string>(accounts[0].email);
  const [loading, setLoading] = React.useState(false);
  const [accountLoading, setAccountLoading] = React.useState(false);
  const [searchResponse, setSearchResponse] = React.useState<GoogleScholarApiResponse | null>(null);

  React.useEffect(() => {
    getAccountInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, searchResponse])

  async function getAccountInfo() {
    try {
      setAccountLoading(true);
      const {data} = await axios('/api/account-info', {params: {apiEmail: selectedAccount}});
      setAccountInfo(data);
      setAccountLoading(false);
    } catch (e) {
      console.error(e);
      setAccountLoading(false);
    }
  }

  async function search() {
    try {
      setLoading(true);
      const {data} = await axios('/api/google-scholar', {
        params: {
          q: query,
          num: 20,
          format: 'JSON',
        }
      })
      setSearchResponse(data);
    } catch (e) {
      console.log('error in api call', e)
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Google Scholar to Excel</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.description}>
            Enter the Search
          </div>
          <div className={styles.accountInfo}>
            <div>Available Search Records:</div>
            <div>{(accountLoading || !accountInfo) ? '...' : accountInfo.plan_searches_left * 20}</div>
            <SelectAccount selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} />
          </div>
        </div>
        <div className={styles.center}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search text"/>
          <button onClick={search} disabled={loading}>🔎</button>
          <ExportExcel loading={loading} setLoading={setLoading} query={query} onDownload={getAccountInfo} maxNumOfRecords={(accountInfo?.plan_searches_left ?? 0) * 20} />
        </div>

        {loading && <Loading />}

        <div className={styles.searchResult}>

          <div className={styles.searchInformation}>
            {searchResponse?.searchInformation && (
              Object.entries(searchResponse?.searchInformation).map(([key, val]) => (
                <div key={key}>
                  <span>{key}:</span>
                  <span>{val}</span>
                </div>
              ))
            )}
          </div>
          {searchResponse?.results?.[0] && (
            <table>
                <tr>
                  {Object.keys(searchResponse.results[0]).map(key => <th key={key}>{key}</th>)}
                </tr>
                {searchResponse.results.map((item: any, i) => (
                  <tr key={i}>
                    {Object.keys(searchResponse.results[0]).map(key => (
                      <td key={key}>{typeof item[key] === 'object' ? item[key].v : item[key]}</td>
                    ))}
                  </tr>
                ))}
            </table>
          )}
        </div>
      </main>
    </>
  )
}
