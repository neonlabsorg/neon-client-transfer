import React from "react"

const Button = ({className = '',
transparent = false,
layoutTheme = 'light',
gradient = false,
children = <></>,
big = false, to = '',
crumpled = false,
gray = false,
iconed = false,
disabled = false,
onClick = () => {}}) => {
    const classNames = `${className} button
        ${big ? 'button--big' : ''}
        ${crumpled ? 'button--crumpled' : ''}
        ${transparent ? 'button--transparent' : ''}
        ${gray ? 'button--gray' : ''}
        ${iconed ? 'button--iconed' : ''}
        ${gradient ? `button--gradient`: `button--${layoutTheme}`}
        ${disabled ? 'button--disabled' : ''}`
    return <React.Fragment>
        {to.length ? <a href={to} target='_blank'
            rel='noopener noreferrer'
            className={classNames}>
                {children}
            </a> : <div className={classNames} onClick={onClick}>{children}</div>}
    </React.Fragment>
}
export default Button
