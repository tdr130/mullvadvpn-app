// @flow

import React from 'react';
import { Component, View, Styles, Animated } from 'reactxp';

export type AccordionProps = {
  height: number | 'auto',
  transitionStyle?: string,
  children?: Array<React.Element<*>> | React.Element<*> // see https://github.com/facebook/flow/issues/1964
};

export type AccordionState = {
  animatedValue: ?Animated.Value,
  animation: ?Animated.CompositeAnimation,
  containerHeight: number,
  contentHeight: number,
};

export default class Accordion extends Component {
  props: AccordionProps;
  static defaultProps: $Shape<AccordionProps> = {
    height: 'auto',
    transitionStyle: 'height 0.25s ease-in-out'
  };

  state: AccordionState = {
    animatedValue: null,
    animation: null,
    containerHeight: 0,
    contentHeight: 0,
  };

  componentDidMount() {
    // update initial state
    if(this.props.height !== Accordion.defaultProps.height) {
      this._updateHeight();
    }
  }

  componentWillUnmount() {
    if(this.state.animation) {
      this.state.animation.stop();
    }
  }

  componentDidUpdate(prevProps: AccordionProps, _prevState: AccordionState) {
    if(prevProps.height !== this.props.height) {
      this._updateHeight();
    }
  }

  render() {
    const { height: _height, children, transitionStyle: _transitionStyle, ...otherProps } = this.props;

    const styles = [];
    if(this.state.animatedValue !== null) {
      const sizeStyle = Styles.createAnimatedViewStyle({
        overflow: 'hidden',
        height: this.state.animatedValue,
      }, false);
      styles.push(sizeStyle);
    }

    return (
      <Animated.View { ...otherProps } style={ styles } onLayout={ this._containerLayoutDidChange }>
        <View onLayout={ this._contentLayoutDidChange }>
          { children }
        </View>
      </Animated.View>
    );
  }

  _updateHeight() {
    const prevAnimatedValue = this.state.animatedValue;
    let fromValue = prevAnimatedValue ?
      prevAnimatedValue :
      Animated.createValue(this.state.containerHeight);

    // hack: obtain intermediate value on the web
    if(fromValue._element) {
      const intermediateValue = parseInt(getComputedStyle(fromValue._element).height);
      fromValue = Animated.createValue(intermediateValue);
    }

    const toValue = this.props.height === 'auto' ?
      this.state.contentHeight :
      this.props.height;

    if(this.state.animation) {
      this.state.animation.stop();
    }

    const animation = Animated.timing(fromValue, {
      toValue: toValue,
      duration: 250,
      easing: Animated.Easing.InOut,
    });

    this.setState({
      animatedValue: fromValue,
      animation: animation,
    });

    animation.start(this._onAnimationEnd);
  }

  _containerLayoutDidChange = (layout) => {
    if(this.state.containerHeight !== layout.height) {
      this.setState({
        containerHeight: layout.height
      });
    }
  }

  _contentLayoutDidChange = (layout) => {
    if(this.state.contentHeight !== layout.height) {
      this.setState({
        contentHeight: layout.height
      });
    }
  }

  _onAnimationEnd = ({ finished }) => {
    // reset height after transition to let element layout naturally
    // if animation finished without interruption
    if(this.props.height === 'auto' && finished) {
      this.setState({
        animatedValue: null,
      });
    }
  }
}