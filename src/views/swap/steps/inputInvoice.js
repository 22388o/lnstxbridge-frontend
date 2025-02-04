import React from 'react';
import PropTypes from 'prop-types';
import injectSheet from 'react-jss';
import { FaBolt } from 'react-icons/fa';
import * as bitcoin from 'bitcoinjs-lib';
import View from '../../../components/view';
import InputArea from '../../../components/inputarea';
import {
  toSatoshi,
  getCurrencyName,
  getSampleInvoice,
  getSmallestDenomination,
  getSampleAddress,
} from '../../../utils';
import { TextField } from '@mui/material';

// import { StacksTestnet, StacksMocknet, StacksMainnet } from '@stacks/network';
import { AppConfig, UserSession } from '@stacks/connect';
import { stacksNetworkType } from '../../../constants';

import axios from 'axios';
import { Box } from '@mui/system';

const InputInvoiceStyles = theme => ({
  wrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: '30px',
    '@media (max-width: 425px)': {
      fontSize: '16px',
    },
  },
  invoice: {
    padding: '50px',
    wordBreak: 'break-all',
    whiteSpace: 'normal',
    width: '600px',
    height: '100px',
    color: '#505050',
    fontSize: '18px',
    backgroundColor: '#D3D3D3',
    borderRadius: '3px',
  },
});

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

let bitcoinNetwork =
  process.env.REACT_APP_STACKS_NETWORK_TYPE === 'mocknet'
    ? bitcoin.networks.regtest
    : bitcoin.networks.mainnet;
// console.log('bitcoinNetwork ', bitcoinNetwork);
function validate(input) {
  try {
    bitcoin.address.toOutputScript(input, bitcoinNetwork);
    return true;
  } catch (e) {
    // console.log(e);
    return false;
  }
}

class StyledInputInvoice extends React.Component {
  state = {
    error: false,
  };

  getUserStacksAddress = () => {
    if (userSession.isUserSignedIn()) {
      let userData = userSession.loadUserData();
      let userStacksAddress = '';
      if (stacksNetworkType === 'mainnet') {
        userStacksAddress = userData.profile.stxAddress.mainnet;
      } else {
        userStacksAddress = userData.profile.stxAddress.testnet;
      }
      return userStacksAddress;
    }
  };

  getUserBalance = async () => {
    const userAddress = this.getUserStacksAddress();
    const apiUrl = `https://stacks-node-api.${stacksNetworkType}.stacks.co`;
    const url = `${apiUrl}/extended/v1/address/${userAddress}/balances`;
    let response = await axios.get(url);
    const userBalance = response.data.stx?.balance;
    console.log('getUserBalance ', userBalance);
    this.onCheck({ target: { checked: true } });
    return userBalance;
  };

  componentDidMount() {
    const { swapInfo, webln } = this.props;
    console.log('inputinvoice componentDidMount ', swapInfo);

    if (webln && swapInfo.quote === 'BTC') {
      webln.makeInvoice(toSatoshi(swapInfo.quoteAmount)).then(response => {
        if (response && response.paymentRequest) {
          const invoice = response.paymentRequest;

          this.setState({ value: invoice });
          this.onChange(invoice);
        }
      });
    }

    if (
      swapInfo.quote === 'STX' ||
      swapInfo.quote === 'USDA' ||
      swapInfo.quote === 'XUSD'
    ) {
      const userStacksAddress = this.getUserStacksAddress();
      this.onChange(userStacksAddress);
      let element = document.getElementById('addressTextfield');
      element.value = userStacksAddress;
      var event = new Event('change');
      element.dispatchEvent(event);
    }
  }

  onChange = input => {
    // accepting STX address for atomic swaps now
    if (
      input.slice(0, 2).toLowerCase() === 'ln' ||
      input.slice(0, 10) === 'lightning:' ||
      input.slice(0, 1).toUpperCase() === 'S' ||
      validate(input)
    ) {
      // console.log('inputinvoice validate ', input);
      this.setState({ value: input, error: false }, () =>
        this.props.onChange(input, false)
      );
    } else {
      this.setState({ value: input, error: true }, () =>
        this.props.onChange(input, true)
      );
    }
  };

  render() {
    const { error } = this.state;
    const { classes, swapInfo } = this.props;

    // console.log('ii.74 ', swapInfo);
    const isLN = localStorage.getItem('quote').includes('⚡');
    const placeholder = isLN
      ? getSampleInvoice(swapInfo.quote)
      : getSampleAddress(swapInfo.quote);
    const pasteText =
      swapInfo.quote === 'BTC' && isLN ? 'Lightning invoice for ' : 'Address';
    // <FaBolt size={25} color="#FFFF00" />

    return (
      <View className={classes.wrapper}>
        {swapInfo.quote === 'BTC' && (
          <p className={classes.title}>
            <b>{getCurrencyName(swapInfo.quote)}</b> {pasteText} {/* <br /> */}
            {swapInfo.quote === 'BTC' && isLN ? (
              <b>
                {toSatoshi(swapInfo.quoteAmount)}{' '}
                {getSmallestDenomination(swapInfo.quote)}
              </b>
            ) : null}
          </p>
        )}
        {(swapInfo.quote === 'STX' ||
          swapInfo.quote === 'USDA' ||
          swapInfo.quote === 'XUSD') && (
          <Box
            sx={{
              width: 500,
              maxWidth: '100%',
            }}
          >
            <TextField
              fullWidth
              label="Address"
              defaultValue={
                localStorage.getItem('ua') ||
                `EG: ${getSampleAddress(swapInfo.quote)}`
              }
              id="addressTextfield"
              disabled
              placeholder={`EG: ${getSampleAddress(swapInfo.quote)}`}
              onChange={this.onChange}
              error={error}
            />
          </Box>
        )}
        {swapInfo.quote === 'BTC' && (
          <InputArea
            width={600}
            height={150}
            error={error}
            autoFocus={true}
            showQrScanner={true}
            value={this.state.value}
            onChange={this.onChange}
            placeholder={`EG: ${placeholder}`}
          />
        )}
        {/* <TextField
          id="outlined-multiline-static"
          label="Multiline"
          multiline
          rows={4}
          value={this.state.value}
          onChange={this.onChange}
          placeholder={`EG: ${placeholder}`}
          // defaultValue="Default Value"
        /> */}
      </View>
    );
  }
}

StyledInputInvoice.propTypes = {
  classes: PropTypes.object.isRequired,
  swapInfo: PropTypes.object.isRequired,
  webln: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

const InputInvoice = injectSheet(InputInvoiceStyles)(StyledInputInvoice);

export default InputInvoice;
