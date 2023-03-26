import React from "react";
import Modal from 'react-modal';
import axios from "axios";
import {downloadBlob} from "@/utils";
import styles from './ExportExcel.module.css';

export default function ExportExcel({ maxNumOfRecords, loading, setLoading, query, onDownload }: { maxNumOfRecords: number, loading: boolean, setLoading: Function, query: string, onDownload: Function }) {
  const [numOfRecords, setNumOfRecords] = React.useState('100');
  const [modalIsOpen, setModalIsOpen] = React.useState(false);

  async function downloadExcel() {
    try {
      setLoading(true);
      const {data} = await axios('/api/google-scholar', {
        responseType: 'blob',
        params: {
          q: query,
          num: numOfRecords,
          format: 'EXCEL',
        }
      })
      downloadBlob(data, 'google-scholar.xlsx');
      onDownload();
      setModalIsOpen(false);
    } catch (e) {
      console.log('error in api call', e)
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setModalIsOpen(true)} disabled={loading}>📓</button>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="Example Modal"
        style={getModalStyles()}
      >
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Export to excel</h2>
            <button onClick={() => setModalIsOpen(false)}>close</button>
          </div>
          <div className={styles.main}>
            <div>
              number of records:
            </div>
            <select value={numOfRecords} onChange={e => setNumOfRecords(e.target.value)} placeholder="search text">
              {[...Array(100)]
                .map((_, i) => String((i + 1) * 20))
                .filter(num => Number(num) <= maxNumOfRecords)
                .map(num => <option key={num} value={num}>{num}</option>)
              }
            </select>
          </div>
          <div className={styles.footer}>
            <button onClick={downloadExcel} disabled={loading}>Download</button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function getModalStyles() {
  return {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      padding: 0,
    },
  };
}
