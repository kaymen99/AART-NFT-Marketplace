import {
  Home,
  Dashboard,
  ItemPage,
  CreateNFT,
  SaleListing,
  SalePage,
  AuctionPage,
  AuctionListing,
  ProfilePage,
  RegisterPage,
} from "./pages";
import { NavBar, Footer } from "./components";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <>
      <Router>
        <NavBar />
        <br />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sales" element={<SaleListing />} />
          <Route path="/auctions" element={<AuctionListing />} />
          <Route path="/nft-page/:id" element={<ItemPage />} />
          <Route path="/sale-page/:id" element={<SalePage />} />
          <Route path="/auction-page/:id" element={<AuctionPage />} />
          <Route path="/create-nft" element={<CreateNFT />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
      <Footer />
    </>
  );
}

export default App;
