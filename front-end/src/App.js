import {
  Home,
  Dashboard,
  ItemPage,
  CreateNFT,
  SaleListing,
  SalePage,
  AuctionPage,
  AuctionListing,
  CreatorPage,
  RegisterPage,
  CollectionPage,
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
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/sales" element={<SaleListing />} />
          <Route path="/auctions" element={<AuctionListing />} />
          <Route path="/nft-page/:id" element={<ItemPage />} />
          <Route path="/sale-page/:id" element={<SalePage />} />
          <Route path="/auction-page/:id" element={<AuctionPage />} />
          <Route path="/create-nft" element={<CreateNFT />} />
          <Route path="/creator-profile/:creator" element={<CreatorPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
      <Footer />
    </>
  );
}

export default App;
