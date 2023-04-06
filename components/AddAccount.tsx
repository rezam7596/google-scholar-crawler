import React from "react";
import Modal from 'react-modal';
import axios from "axios";
import styles from './AddAccount.module.css';

export default function AddAccount() {
  const [modalIsOpen, setModalIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [apiKey, setApiKey] = React.useState<string>('');

  async function addAccount() {
    try {
      setLoading(true);
      await axios.post('/api/add-account', {title, email, apiKey});
      alert('account added successfully. refresh the page to see it');
      setModalIsOpen(false);
      setLoading(false);
    } catch (e) {
      console.error(e);
      alert('error adding account');
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setModalIsOpen(true)}>➕</button>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="Add Account"
        style={getModalStyles()}
      >
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Add Account</h2>
            <button onClick={() => setModalIsOpen(false)}>close</button>
          </div>
          <div className={styles.main}>
            <div>
              <div>
                Title:
              </div>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <div>
                Email:
              </div>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <div>
                Api key:
              </div>
              <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
          </div>
          <div className={styles.footer}>
            <button onClick={addAccount}>{loading ? 'Adding...' : 'Add'}</button>
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
