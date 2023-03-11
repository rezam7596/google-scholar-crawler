import Head from 'next/head'
import React from "react";
import styles from '@/styles/Home.module.css'
import axios from "axios";
import {downloadBlob} from "@/pages/_utils";
import { Response as ApiResponse } from './api/google-scholar';
import Loading from "@/pages/_components/Loading";

export default function Home() {
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [searchResponse, setSearchResponse] = React.useState<ApiResponse | null>(null);

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

  async function downloadExcel() {
    try {
      setLoading(true);
      const {data} = await axios('/api/google-scholar', {
        responseType: 'blob',
        params: {
          q: query,
          num: 500,
          format: 'EXCEL',
        }
      })
      downloadBlob(data, 'google-scholar.xlsx');
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
        <div className={styles.description}>
          Enter the Search
        </div>

        <div className={styles.center}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search text"/>
          <button onClick={search} disabled={loading}>🔎</button>
          <button onClick={downloadExcel} disabled={loading}>📓</button>
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
                {searchResponse.results.map((item: object, i) => (
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
