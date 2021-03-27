// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.11;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Voting.sol";

contract TestVoting {

  function testInitialWorkflowStatus() public {
    Voting voting = Voting(DeployedAddresses.Voting());

    Assert.equal(voting.workflowStatus, Voting.WorkflowStatus.RegisteringVoters, "Initial workflow status is 0.");
  }

}
