import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Layout from '../components/layout/Layout';
import AccountsList from '../components/accounts/AccountList';
import accountService from '../services/accountService';
import { getTransactionStats } from '../services/transactionService';
import { logger } from '../utils/logger';

const AccountsPage = () => {

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 fade-in" style={{ animationDelay: '0.3s' }}>
          <AccountsList />
        </div>
      </div>
    </Layout>
  );
};

export default AccountsPage;