import React, { Component } from "react";
import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Row from 'react-bootstrap/Row';

import "./App.css";


class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null, 
    status: 0, address: '0x...', registered: [], proposal: '', proposals: [] };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      const instance = new web3.eth.Contract(
        VotingContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      this.setState({ web3, accounts, contract: instance }, this.getStatus);
    } catch (error) {
      alert(`Failed to load web3, accounts, or contract. Check console for details.`,);
      console.error(error);
    }
  };


  getStatus = async () => {
    const { contract } = this.state;

    const status = await contract.methods.getStatus().call();
    console.log("status="+status);

    this.setState({ status: status });
  };


  getStatusDisplay() {
    const { status } = this.state;

    switch (status) {
      case '0': return 'Registering voters';
      case '1': return 'Proposals registration started';
      case '2': return 'Proposals registration ended';
      case '3': return 'Voting session started';
      case '4': return 'Voting session ended';
      case '5': return 'Votes tallied';
      default: return "UNKNOWN STATUS";
    }    
  }


  isRegisteringVoters() { return this.state.status === '0'; }
  isProposalsRegistrationStarted() { return this.state.status === '1'; }
  isProposalsRegistrationEnded() { return this.state.status === '2'; }
  isVotingSessionStarted() { return this.state.status === '3'; }
  isVotingSessionEnded() { return this.state.status === '4'; }
  isVotesTallied() { return this.state.status === '5'; }


  startProposalsRegistration = async () => {
    const { accounts, contract } = this.state;
    const result = await contract.methods.startProposalsRegistration().send({ from: accounts[0]});
    this.updateStatus(result);
  }


  stopProposalsRegistration = async () => {
    const { accounts, contract } = this.state;
    const result = await contract.methods.closeProposalsRegistration().send({ from: accounts[0]});
    this.updateStatus(result);
  }


  startVotingSession = async () => {
    const { accounts, contract } = this.state;
    const result = await contract.methods.startVotingSession().send({ from: accounts[0]});
    this.updateStatus(result);
  }


  stopVotingSession = async () => {
    const { accounts, contract } = this.state;
    const result = await contract.methods.closeVotingSession().send({ from: accounts[0]});
    this.updateStatus(result);
  }


  updateStatus(result) {
    const status = result.events.WorkflowStatusChange.returnValues.newStatus;
    console.log("Status from event: " + status);

    this.setState({ status: status});
  }


  addAddress = async () => {
    const { address, contract, accounts } = this.state;
    const result = await contract.methods.addToWhitelist(address).send({from: accounts[0]});

    const retAddress = result.events.VoterRegistered.returnValues.voterAddress;
    this.setState({ ...this.state, registered: [...this.state.registered, retAddress] });
  }


  addProposal = async () => {
    const { proposal, contract, accounts } = this.state;
    const result = await contract.methods.propose(proposal).send({from: accounts[0]});

    const retProposal  = result.events.ProposalRegistered.returnValues.proposalId;
    this.setState({ ...this.state, proposals: [...this.state.proposals, { 'id': retProposal, 'description': proposal }] });
  }


  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
      <div>
        <Navbar variant="dark" bg="dark">
            <Navbar.Brand className="brand">
              <img src="alyra.png" alt="" height="30" className="d-inline-block align-top" />
              { ' ' } Voting DApp
            </Navbar.Brand>
            <Navbar.Collapse className="justify-content-end">
              <NavDropdown title={ this.getStatusDisplay() } id="collasible-nav-dropdown">
                <NavDropdown.Header>Proposals registration</NavDropdown.Header>
                <NavDropdown.Item disabled={ !this.isRegisteringVoters() } onClick={ this.startProposalsRegistration }>Start</NavDropdown.Item>
                <NavDropdown.Item disabled={ !this.isProposalsRegistrationStarted() } onClick={ this.stopProposalsRegistration }>Stop</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Header>Voting session</NavDropdown.Header>
                <NavDropdown.Item disabled={ !this.isProposalsRegistrationEnded() } onClick={ this.startVotingSession }>Start</NavDropdown.Item>
                <NavDropdown.Item disabled={ !this.isVotingSessionStarted() } onClick={ this.stopVotingSession }>Stop</NavDropdown.Item>
              </NavDropdown>
            </Navbar.Collapse>
        </Navbar>        
{ this.isRegisteringVoters() && 
        <Container>
          <Row>&nbsp;</Row>
          <Row>
            <Form>
              <Form.Group controlId="formRegistering" >
                <Form.Label>Register address</Form.Label>
                <Form.Control type="text" onChange={e => this.setState({ address: e.target.value }) } value={ this.state.address } />
              </Form.Group>

              <Button variant="primary" onClick={ () => this.addAddress() }>
                Add address
              </Button>
            </Form>
          </Row>
          <Row>&nbsp;</Row>
          <Row>
            <ListGroup>
              { this.state.registered.map(item => <ListGroup.Item>{item}</ListGroup.Item>) }
            </ListGroup>
          </Row>
        </Container>
}
{ this.isProposalsRegistrationStarted() &&
        <Container>
          <Row>
            <Form>
              <Form.Group controlId="formProposal" >
                <Form.Label>Proposal description :</Form.Label>
                <Form.Control as="textarea" rows={5} onChange={e => this.setState({ proposal: e.target.value }) } value={ this.state.proposal }  />
              </Form.Group>

              <Button variant="primary" onClick={ () => this.addProposal() } >
                Add proposal
              </Button>
            </Form>
          </Row>
          <Row>&nbsp;</Row>
          <Row>
            <ListGroup>
              { this.state.proposals.forEach(item => <ListGroup.Item>{item.id} {item.description}</ListGroup.Item>) }
            </ListGroup>
          </Row>
        </Container>
}  
      </div>
    );
  }
}

export default App;
