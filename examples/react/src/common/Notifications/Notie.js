import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ReactComponent as ErrorIcon } from '@/assets/notifications/error_icon.svg'
import { ReactComponent as InfoIcon } from '@/assets/notifications/info_icon.svg'
import { ReactComponent as SuccessIcon } from '@/assets/notifications/success_icon.svg'
import { ReactComponent as CrossIcon } from '@/assets/cross.svg'
import cx from 'classnames';

const ICONS = {
    'SUCCESS': SuccessIcon,
    'INFO': InfoIcon,
    'ERROR': ErrorIcon
}

const defaultState = () => ({
    visible: false,
    locked: false,
    yesBtnText: 'Yes',
    noBtnText: 'No'
});

export default class Notie extends Component {
    static defaultProps = {
        ttl: 5000
    };

    static propTypes = {
        ttl: PropTypes.number
    };

    constructor(props) {
        super(props);

        this.state = Object.assign({
            message: '',
            title: '',
            level: 'INFO'
        }, defaultState());
    }

    componentDidMount() {
        this.root.style.opacity = 0;
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.state.visible !== nextState.visible;
    }

    componentWillUnmount() {
        if (this.transitionendCallback) {
            this.root.removeEventListener('transitionend', this.transitionendCallback);
            this.transitionendCallback = null;
        }

        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    alert = (settings = {}) => {
        if (this.state.locked) return;

        const toLock = settings.level === 'CONFIRM';

        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (this.state.visible) {
            this.hide(() => this.alert(settings));
            return;
        }

        this.root.style.opacity = 1;

        this.setState(state => ({
            message: settings.message,
            title: settings.title,
            level: settings.level,
            visible: true,
            locked: toLock,
            yesBtnText: settings.yesBtnText || state.yesBtnText,
            noBtnText: settings.noBtnText || state.noBtnText
        }));

        if (!toLock) {
            this.timeout = setTimeout(() => {
                this.hide();
                this.timeout = null;
            }, settings.ttl || this.props.ttl);
        }
    }

    confirm = (title, props) => {
        this.alert(Object.assign({}, props, { title, level: 'CONFIRM' }));

        return new Promise((resolve, reject) => {
            this.confirmResolve = resolve;
            this.confirmReject = reject;
        });
    }

    success = (title, message, ttl) => {
        this.alert({ title, message, level: 'SUCCESS', ttl });
    }

    error = (title, message, ttl) => {
        this.alert({ title, message, level: 'ERROR', ttl });
    }

    info = (title, message, ttl) => {
        this.alert({ title, message, level: 'INFO', ttl });
    }

    hide = (callback) => {
        this.setState(() => defaultState());
        this.transitionendCallback = () => {
            this.root.style.opacity = 0;
            if (typeof callback === 'function') callback();
            this.root.removeEventListener('transitionend', this.transitionendCallback);
            this.transitionendCallback = null;
        };
        this.root.addEventListener('transitionend', this.transitionendCallback);
    }

    handleYes = () => this.hide(this.confirmResolve);

    handleNo = () => this.hide(this.confirmReject);

    handleDismiss = () => {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (this.state.visible) {
            this.hide();
        }
    }

    rootRef = c => (this.root = c);

    render() {
        const { message, level, visible, title } = this.state;
        const Icon = ICONS[level]
        const classes = cx(
            'react-notie',
            `react-notie-level--${level.toLowerCase()}`,
            {
                'react-notie--active': visible
            }
        );

        return (
            <div ref={this.rootRef} className={classes}>
                {level === 'CONFIRM' && visible && <div className='react-notie-overlay' />}
                <div className='react-notie-container'>
                    <div className='flex items-center'>
                        <div className='mr-4'>
                            <Icon/>
                        </div>
                        <div className='flex flex-col'>
                            <div className='react-notie-title'>
                                {title}
                            </div>
                            <div className='react-notie-message'>
                                {message}
                            </div>
                        </div>
                    </div>
                    
                    {level !== 'CONFIRM' && <div className='react-notie-dismiss' onClick={this.handleDismiss}><CrossIcon/></div>}
                    {level === 'CONFIRM' && (
                        <div className='react-notie-choices'>
                            <div className='react-notie-choice react-notie-choice--yes' onClick={this.handleYes}>
                                {this.state.yesBtnText}
                            </div>

                            <div className='react-notie-choice react-notie-choice--no' onClick={this.handleNo}>
                                {this.state.noBtnText}
                            </div>
                        </div>
                    )}
                    
                </div>
            </div>
        );
    }
}