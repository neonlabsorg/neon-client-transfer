import React from 'react'
import ReactDOM from 'react-dom'
import Button from '../Button'
import {ReactComponent as CloseIcon} from '../../assets/cross.svg'


class Modal extends React.Component {
    constructor(props) {
        super(props)
        this.overlay = document.querySelector('.modals-overlay')
        this.rootRef = React.createRef()
    }


    closeModal() {
        if (this.overlay) {
            this.overlay.remove()
        }
        this.props.onDestroy()
    }

    render() {
        const {
            className, bodyClassName, headerClassName, children, panel, e2eActionClose, e2eSelectorTitle, titleClassName
        } = this.props
        let actions = []
        if (panel) {
            if (Array.isArray(panel.props.children)) actions = panel.props.children
            else actions.push(panel.props.children)
        }
        const renderBtnPanel = () => {
            if (panel) {
                return <div className={'modal__btn-panel'}>
                    {actions.map((child, index) => <Button className={'modal__btn'} key={index} {...child.props}/>)}
                </div>
            }
        }
        const renderCloseIcon = () => {
            if (this.props.onDestroy) {
                return <div className={'modal__close'}
                    data-e2e-action={e2eActionClose}
                    onClick={this.closeModal.bind(this)}>
                    <CloseIcon/>
                </div>
            }
        }
        const renderChild = () => {
            return React.cloneElement(children, { onClose: this.closeModal.bind(this) })
        }

        return <div className={`modal ${className ? className : ''}`} ref={this.rootRef}>
            <div className={`modal__header ${headerClassName ? headerClassName : ''}`}>
                <div className={`modal__title ${titleClassName ? titleClassName : ''}`} data-e2e-selector={e2eSelectorTitle}>{this.props.title}</div>
                {renderCloseIcon()}
            </div>
            <div className={`modal__body ${bodyClassName ? bodyClassName : ''}`}>
                {renderChild()}
            </div>
            {renderBtnPanel()}
        </div>
    }
}

class ModalCaller {
    constructor(options) {
        this.modalsContainer = document.getElementById('modals')
        this.overlay = document.createElement('div')
        this.overlay.setAttribute('class', 'modals-overlay')
        this.overlayBg = document.createElement('div')
        this.overlayBg.setAttribute('class', 'modals-overlay__bg')

        this.state = {
            modalProps: {
                title: options.title,
                className: options.className || '',
                headerClassName: options.headerClass || '',
                bodyClassName: options.bodyClass || '',
                titleClassName: options.titleClass || '',
                children: options.children,
                panel: options.actionsFragment,
                // if child option is a react compinent, not a node.
                onDestroy: () => {
                    this.destroy()
                }
            }
        }
        this._render()
        this._bindOverlayClose()
    }

    _bindOverlayClose() {
        this.overlayBg.addEventListener('click', this.handleOverlay.bind(this))
    }

    handleOverlay() {
        this.overlayBg.removeEventListener('click', this.handleOverlay)
        this.destroy()
    }

    _render() {
        this.modalsContainer.appendChild(this.overlay)
        ReactDOM.render(<Modal {...this.state.modalProps} />, this.overlay)
        this.overlay.appendChild(this.overlayBg)
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.overlay)
        this.overlay.remove()

    }
}

class ModalRenderer extends React.Component {
    constructor(props) {
        super(props)
        this.state = { ...props }
        let modalContainer = document.getElementById('modals')
        this.overlay = document.createElement('div')
        this.overlay.setAttribute('class', 'modals-overlay')
        modalContainer.appendChild(this.overlay)
    }

    render() {
        return ReactDOM.createPortal(<Modal {...this.state}/>, this.overlay)
    }
}

export { Modal, ModalCaller, ModalRenderer }
