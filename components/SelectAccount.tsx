import React from "react";
import Modal from 'react-modal';
import axios from "axios";
import styles from './ExportExcel.module.css';
import {AccountType} from "@/utils/accounts";

export default function SelectAccount({ selectedAccount, setSelectedAccount }: { selectedAccount: string, setSelectedAccount: Function }) {
  const [modalIsOpen, setModalIsOpen] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Array<AccountType>>([]);

  React.useEffect(() => {
    getAccounts();
  }, [])

  async function getAccounts() {
    try {
      const {data} = await axios('/api/get-available-accounts');
      setAccounts(data);
      setSelectedAccount(data[0]?.email)
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <button onClick={() => setModalIsOpen(true)}>💻</button>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="Select Account"
        style={getModalStyles()}
      >
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Select Account</h2>
            <button onClick={() => setModalIsOpen(false)}>close</button>
          </div>
          <div className={styles.main}>
            <div>
              selected account:
            </div>
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
              {
                accounts.map(account => <option key={account.email} value={account.email}>{account.title} ({account.email})</option>)
              }
            </select>
          </div>
          <div className={styles.footer}>
            <button onClick={() => setModalIsOpen(false)}>OK</button>
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
