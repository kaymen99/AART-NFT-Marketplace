import React from "react";
import { FaUserAlt, FaRegImage, FaUserEdit } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import images from "../../assets/images";

const Account = ({ currentAccount, disconnect }) => {
  return (
    <div className="account">
      <div className="account-box">
        <img src={images.user} alt="user account" className="account-img" />
        <div className="account-info">
          <p>Shoaib Bhai</p>
          <small>{currentAccount.slice(0, 18)}..</small>
        </div>
      </div>

      <div className="account-menu">
        <div className="account-menu-item">
          <FaUserAlt />
          <a href="/profile">My Profile</a>
        </div>
        <div className="account-menu-item">
          <FaRegImage />
          <a href="/author">My Items</a>
        </div>
        <div className="account-menu-item">
          <FaUserEdit />
          <a href="/account">Edit Profile</a>
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
