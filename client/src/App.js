import React, { Component } from "react";
import { ToastContainer, toast } from 'react-toastify';

import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";

import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Row from 'react-bootstrap/Row';

import 'react-toastify/dist/ReactToastify.css';
import "./App.css";


class App extends Component {
 
  state = { storageValue: 0, web3: null, accounts: null, contract: null, 
    status: 0, err: null, registered: [], proposals: [], winner: null };

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

      // Callback when account is changed in Metamask
      window.ethereum.on('accountsChanged', async () => {
        await web3.eth.getAccounts((error, accounts) => {
          console.log(`Accounts updated ${accounts}`);
          this.setState({ accounts: accounts });
        });
      });

      this.setState({ web3, accounts, contract: instance }, this.getStatus);
    } catch (error) {
      alert(`Failed to load web3, accounts, or contract. Check console for details.`,);
      console.error(error);
    }
  };


  getStatus = async () => {
    const { contract } = this.state;

    try {
      const status = await contract.methods.workflowStatus().call();
      console.log(`status=${status}`);

      this.setState({ status: status });

      // Restore data
      if (status !== '0') {
        console.log(`Reload proposals`);
        const result = await contract.methods.getProposals().call();
        this.setState({proposals: result.map((value, i) => { return { id: i, description: value };}) });

        if (status === '4' || status === '5') {
          this.getWinningProposal();
        }
      }
      else {
        console.log(`Reload whitelist`);
        const result = await contract.methods.getWhitelist().call();
        this.setState({registered: result});
      }
    }
    catch (err) {
      this.manageErr(err);
    }
  };


  // ===== WorkflowStatus utilities functions =====

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


  // ===== Admin workflowStatus update functions =====

  startProposalsRegistration = async () => {
    try {
      const { accounts, contract } = this.state;
      const result = await contract.methods.startProposalsRegistration().send({ from: accounts[0]});
      this.updateStatus(result);
    }
    catch (err) {
      this.manageErr(err);
    }
  }


  stopProposalsRegistration = async () => {
    try {
      const { accounts, contract } = this.state;
      const result = await contract.methods.closeProposalsRegistration().send({ from: accounts[0]});
      this.updateStatus(result);
    }
    catch (err) {
      this.manageErr(err);
    }
  }


  startVotingSession = async () => {
    try {
      const { accounts, contract } = this.state;
      const result = await contract.methods.startVotingSession().send({ from: accounts[0]});
      this.updateStatus(result);
    }
    catch (err) {
      this.manageErr(err);
    }
  }


  stopVotingSession = async () => {
    try {
      const { accounts, contract } = this.state;
      const result = await contract.methods.closeVotingSession().send({ from: accounts[0]});
      this.updateStatus(result);

      this.getWinningProposal();
    }
    catch (err) {
      this.manageErr(err);
    }
  }


  updateStatus(result) {
    const status = result.events.WorkflowStatusChange.returnValues.newStatus;
    console.log("Status from event: " + status);

    this.setState({ err: null, status: status});
  }


  manageErr(err) {
    console.log(err);
    var msg = err.message;
    if (msg.includes('"data"')) {
      msg = /"message":"[^:]+: revert ([^"]+)".*/.exec(msg)[1];
    }
    this.setState({ err: msg });
  }


  getWinningProposal = async () => {
    const { accounts, contract } = this.state;
    
    console.log(`Get winning proposal`);
    const result = await contract.methods.getWinningProposal().call();
    this.setState({ winner: { id: result._proposalId, description: result._description, voteCount: result._voteCount }});
  }


  addAddress = async () => {
    const { contract, accounts } = this.state;
    const address = this.address.value;
    console.log(`Add address ${address} ${accounts}`);
    try {
      const result = await contract.methods.addToWhitelist(address).send({from: accounts[0]});
      const retAddress = result.events.VoterRegistered.returnValues.voterAddress;
      this.setState({ err: null, registered: [...this.state.registered, retAddress] });
    }
    catch (err) {
      this.manageErr(err);
    }
  }


  addProposal = async () => {
    const { contract, accounts } = this.state;
    const proposal = this.proposal.value;
    console.log(`Add proposal [${proposal}] [${accounts}]`);
    try {
      const result = await contract.methods.propose(proposal).send({from: accounts[0]});

      const retProposal  = result.events.ProposalRegistered.returnValues.proposalId;
      this.setState({ err: null, proposals: [...this.state.proposals, { id: retProposal, description: proposal }] });
    }
    catch (err) {
      this.manageErr(err);
    }
  }


  addVote = async (id) => {
    const { contract, accounts } = this.state;
    console.log(`Add vote [${id}] [${accounts}]`);
    try {
      const result = await contract.methods.vote(id).send({from: accounts[0]});

      const retProposal  = result.events.Voted.returnValues.proposalId;
      this.setState({ err: null });
      toast.success('🧾 Voted !', {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
    catch (err) {
      this.manageErr(err);
    }
  }


  setAddressRef = (element) => {
    this.address = element;
  }


  setProposalRef = (element) => {
    this.proposal = element;
  }  


  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
      <div>
        <ToastContainer />
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
{ this.state.err && 
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{this.state.err}</p>
        </Alert> 
}
{ this.isRegisteringVoters() && 
        <Container fluid>
          <Row>&nbsp;</Row>
          <Row>
            <Form>
              <Form.Group controlId="formRegistering" >
                <Form.Label>Register address</Form.Label>
                <Form.Control type="text" 
                  onFocus={e => e.target.select() }
                  ref={this.setAddressRef}
                />
              </Form.Group>

              <Button variant="primary" onClick={ () => this.addAddress() }>
                Add address
              </Button>
            </Form>
          </Row>
          <Row>&nbsp;</Row>
          <Row>
            <ListGroup>
              { this.state.registered.map(item => <ListGroup.Item key={item}>{item}</ListGroup.Item>) }
            </ListGroup>
          </Row>
        </Container>
}
{ (this.isProposalsRegistrationStarted() || this.isProposalsRegistrationEnded()) &&
        <Container fluid>
          { this.isProposalsRegistrationStarted() &&
            <Row>
              <Form className="full">
                <Form.Group controlId="formProposal" >
                  <Form.Label>Proposal description :</Form.Label>
                  <Form.Control as="textarea" rows={5} ref={this.setProposalRef} />
                </Form.Group>

                <Button variant="primary" onClick={ () => this.addProposal() } >
                  Add proposal
                </Button>
              </Form>
            </Row>
          }
          <Row>&nbsp;</Row>
  
          <Row>
            <ListGroup>
              { this.state.proposals.map(({id, description}) => <ListGroup.Item key={id}>{id} {description}</ListGroup.Item>) }
            </ListGroup>
          </Row>
        </Container>
}
{ this.isVotingSessionStarted() &&
        <Container>
          <ListGroup>
            { this.state.proposals.map(({id, description}) => 
              <ListGroup.Item key={id}>
                <Row>
                  <Col xs={3}>{description}</Col>
                  <Col xs={1}><Button variant="info" onClick={ () => this.addVote(id) }>Vote</Button> </Col>
                </Row>
              </ListGroup.Item>) 
            }
          </ListGroup>
        </Container>
}
{ (this.isVotingSessionEnded() || this.isVotesTallied()) && this.state.winner &&
        <Container>
          <h1>Winning proposal ({this.state.winner.voteCount} votes):</h1>
          <h2>{this.state.winner.id}. {this.state.winner.description}</h2>
        </Container>
}
      </div>
    );
  }
}

export default App;
