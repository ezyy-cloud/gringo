import { Suspense } from 'react';
import ProfilePage from './profile/ProfilePage';
import PropTypes from 'prop-types';

// Component loading fallback
const ComponentLoader = () => (
  <div className="component-loader">
    <div className="spinner-small"></div>
  </div>
);

const Profile = ({ user, isDarkMode, handleLogout, toggleDarkMode }) => {
  return (
    <Suspense fallback={<ComponentLoader />}>
      <ProfilePage 
        user={user}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
    </Suspense>
  );
};

Profile.propTypes = {
  user: PropTypes.object.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
  handleLogout: PropTypes.func.isRequired,
  toggleDarkMode: PropTypes.func.isRequired
};

export default Profile; 