// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

contract AARTErrors {
    error AARTMarket_OnlyTokenOwner(uint256 tokenId);
    error AARTMarket_ItemNotApproved(uint256 tokenId);
    error AARTMarket_AddressZero();
    error AARTMarket_OnlySeller(uint256 id);
    error AARTMarket_ListingNotActive(uint256 listingId);
    error AARTMarket_OfferAmountNotApproved();
    error AARTMarket_InvalidExpirationTime();
    error AARTMarket_OfferNotActive(uint256 offerId, uint256 tokenId);
    error AARTMarket_OnlyOfferer(uint256 offerId, uint256 tokenId);
    error AARTMarket_InvalidAuctionPeriod(uint256 endTime, uint256 startTime);
    error AARTMarket_InvalidStartPrice();
    error AARTMarket_InvalidDirectBuyPrice(uint256 directBuyPrice);
    error AARTMarket_AuctionNotOpen(uint256 auctionId);
    error AARTMarket_AlreadyHighestBid(uint256 auctionId);
    error AARTMarket_InsufficientBid(uint256 auctionId);
    error AARTMarket_InsufficientAmount();
    error AARTMarket_IsHighestBidder(uint256 auctionId);
    error AARTMarket_HasNoBid(uint256 auctionId);
    error AARTMarket_AuctionPeriodNotEnded(uint256 auctionId, uint256 endTime);
    error AARTMarket_CancelImpossible(uint256 auctionId);
    error AARTMarket_UnsupportedToken(address token);
    error AARTMarket_AlreadySupported(address token);
    error AARTMarket_InvalidFee(uint256 fee);
    error AARTMarket_TransferFailed();
}
