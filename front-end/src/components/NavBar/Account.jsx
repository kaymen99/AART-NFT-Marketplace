import React from "react";
import { useSelector } from "react-redux";
import { FaUserAlt, FaUserEdit } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import images from "../../assets/images";

const Account = ({ disconnect }) => {
  const wallet = useSelector((state) => state.userData.value);

  return (
    <div className="account">
      <div className="account-box">
        <img
          src={wallet.profileImg !== "" ? wallet.profileImg : images.user}
          alt="user account"
          className="account-img"
        />
        <div className="account-info">
          <p>{wallet.username}</p>
          <small>{wallet.account.slice(0, 15)}...</small>
        </div>
      </div>
      <div className="account-menu">
        <div className="account-menu-item">
          <FaUserAlt />
          <a href={`/dashboard`}>Dashboard</a>
        </div>
        <div className="account-menu-item">
          <FaUserEdit />
          <a href="/register">Edit Profile</a>
        </div>
        <div className="account-menu-item" onClick={disconnect}>
          <MdLogout />
          <a>Disconnect</a>
        </div>
      </div>
    </div>
  );
};

export default Account;
