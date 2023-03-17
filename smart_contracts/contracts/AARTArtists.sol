// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AARTArtists is ERC721URIStorage, Ownable {
    //--------------------------------------------------------------------
    // VARIABLES

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => string) private _tokenURIs;

    struct Profile {
        uint256 id;
        string uri;
    }

    //--------------------------------------------------------------------
    // EVENTS

    event AART__ProfileCreated(uint256 tokenId, address owner, string uri);
    event AART__ProfileUpdated(uint256 tokenId, string newUri);
    event AART__ProfileDeleted(uint256 tokenId);

    //--------------------------------------------------------------------
    // ERRORS

    error AART__AlreadyRegistered();
    error AART__OnlyEOA();
    error AART__OnlyTokenOwner(uint tokenId);

    constructor() ERC721("AART Artists Profiles", "AAP") {}

    // ************************ //
    //      Main Functions      //
    // ************************ //

    function create(string memory uri) external returns (uint256) {
        // Each address can only have one profile nft associated with it
        if (hasProfile(msg.sender)) revert AART__AlreadyRegistered();

        uint256 tokenId = _tokenIds.current();
        _tokenIds.increment();

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit AART__ProfileCreated(tokenId, msg.sender, uri);

        return tokenId;
    }

    function update(uint256 tokenId, string memory newUri) external {
        if (msg.sender != ownerOf(tokenId))
            revert AART__OnlyTokenOwner(tokenId);
        _setTokenURI(tokenId, newUri);

        emit AART__ProfileUpdated(tokenId, newUri);
    }

    function burn(uint256 tokenId) external {
        if (msg.sender != ownerOf(tokenId))
            revert AART__OnlyTokenOwner(tokenId);
        _burn(tokenId);

        emit AART__ProfileDeleted(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);
    }

    // Disable all ERC721 transfers : the artists NFT profile are not transferable
    function _transfer(address, address, uint256) internal virtual override {
        revert("AART profile NFTs are not transferable");
    }

    function _setTokenURI(
        uint256 tokenId,
        string memory _tokenURI
    ) internal override {
        _tokenURIs[tokenId] = _tokenURI;
    }

    // ***************** //
    //      Getters      //
    // ***************** //

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function hasProfile(address user) public view returns (bool) {
        return balanceOf(user) != 0;
    }

    function getAllProfiles() external view returns (Profile[] memory) {
        uint256 lastestId = _tokenIds.current();
        Profile[] memory items = new Profile[](lastestId);
        for (uint256 i; i < lastestId; ) {
            string memory uri = _tokenURIs[i];
            items[i] = Profile(i, uri);

            unchecked {
                ++i;
            }
        }
        return items;
    }
}
