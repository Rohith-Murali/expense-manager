import Layout from '../components/layout/Layout';
import AccountsList from '../components/accounts/AccountList';
const AccountsPage = () => {
  return (
    <Layout>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8 fade-in' style={{ animationDelay: '0.3s' }}>
          <AccountsList />
        </div>
      </div>
    </Layout>
  );
};

export default AccountsPage;
