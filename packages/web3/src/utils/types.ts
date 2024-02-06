import {
  FMT_BYTES,
  FMT_NUMBER
} from "web3-types";

export type ReturnFormat = {
  number: FMT_NUMBER.BIGINT,
  bytes: FMT_BYTES.HEX,
};

export type GasInterface = {
  gas: bigint
}

export type GasPriceInterface = {
  gasPrice: bigint
}
