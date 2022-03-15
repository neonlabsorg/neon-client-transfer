
import Button from '../Button';
import { WalletIcon } from './WalletIcon';


export const WalletListItem = ({ handleClick, wallet }) => {
    return (
        <li className='flex flex-col'>
            <Button className='justify-center' onClick={handleClick}>
                <>
                    <WalletIcon wallet={wallet} className='mr-6' />
                    {wallet.name}
                </>
            </Button>
        </li>
    );
};
