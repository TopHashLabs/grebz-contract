// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Grebz is ERC721, ERC721Enumerable, Ownable {
  using Counters for Counters.Counter;
  using Strings for uint256;

  Counters.Counter public tokenId;

  string public baseURI;

  uint256 public constant MAX_SUPPLY = 5555;

  mapping(address => bool) public whitelist;

  constructor() ERC721("Grebz", "GREBZ") {}

  function setBaseURI(string memory _uri) external onlyOwner {
    baseURI = _uri;
  }

  function _baseURI() internal view override(ERC721) returns (string memory) {
    return baseURI;
  }

  function _beforeTokenTransfer(
    address _from,
    address _to,
    uint256 _tokenId
  ) internal override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(_from, _to, _tokenId);
  }

  function supportsInterface(bytes4 _interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable)
    returns (bool)
  {
    return super.supportsInterface(_interfaceId);
  }
}
