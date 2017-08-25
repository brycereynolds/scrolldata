import React, { PureComponent } from 'react';
import { oneOfType, func, bool, node, arrayOf, number } from 'prop-types';
import Scroller from './Scroller';
import {
    EMPTY_ARRAY, toggle, numberOrFunc, result, fire, indexOf,
    contains
} from './util';

export const expanded = oneOfType([arrayOf(number), func]);

/**
 * A simple wrapper class so that components do
 * not need to think to hard about toggling.
 *
 */
export class ToggleItem extends PureComponent {

    static displayName = 'ToggleItem';

    static propTypes = {
        /** toggles the row by rowIndex, if a second argument is given either true or false it will be forced open if (true) and closed if false. **/
        onToggle  : func.isRequired,
        rowIndex  : number,
        render    : func.isRequired,
        isExpanded: func,
    };

    handleToggle = () => {
        this.props.onToggle(this.props.rowIndex)
    };

    render() {
        const { render, isExpanded, ...props }
                  = this.props;
        return render({
            ...props,
            isExpanded: isExpanded(props.rowIndex),
            onToggle  : this.handleToggle
        });
    }
}


export default class ExpandableScroller extends PureComponent {
    static displayName = 'ExpandableScroller';

    static propTypes    = {
        ...Scroller.propTypes,
        //accepts an array of rowIndexes that will be Toggled
        //if returns false toggle is canceled.
        onExpandToggle: func,
        //a function or an array of RowIndexes, function results in an array of
        // RowIndexes.
        expanded,
        //How tall to make expanded item.  A function will receive the rowIndex
        expandedHeight: numberOrFunc.isRequired,
    };
    static defaultProps = {
        ...Scroller.defaultProps,
        expanded: [],
        hash    : ''
    };


    state = {
        expanded: result(this.props.expanded) || EMPTY_ARRAY,

    };

    componentWillMount() {
        this.setup(this.props);
    }


    componentWillReceiveProps(props) {
        let newState;
        if (props.expanded !== this.props.expanded) {
            if (!newState) {
                newState = {};
            }
            newState.hash     = Date.now();
            newState.expanded = result(props.expanded) || EMPTY_ARRAY;
        }
        if (props.renderItem !== this.props.renderItem || props.renderBlank
                                                          !== this.props.renderBlank) {
            this.setup(props);
            if (!newState) {
                newState = {};
            }
            newState.hash = Date.now();
        }

        if (props.hash !== this.props.hash) {
            if (!newState) {
                newState = {};
            }
            newState.hash = props.hash;
        }
        if (props.rowHeight !== this.props.rowHeight) {
            if (!newState) {
                newState = {};
            }
            newState.hash = Date.now();
        }

        if (newState) {
            if (!newState.hash) {
                newState.hash = Date.now();
            }
            this.setState(newState);
        }
    }

    setup({ renderBlank, renderItem, }) {
        const { isExpanded, handleToggleExpand, } = this;

        this.renderItem = (props) => (
            <ToggleItem {...props}
                        isExpanded={isExpanded}
                        onToggle={handleToggleExpand}
                        render={renderItem}/>);

        if (renderBlank) {
            this.renderBlank = (props) => (
                <ToggleItem {...props}
                            isExpanded={isExpanded}
                            onToggle={handleToggleExpand}
                            render={renderBlank}/>);
        }
    }

    rowHeight = (rowIndex) => this.isExpanded(rowIndex) ? result(
        this.props.expandedHeight, rowIndex) : this.props.rowHeight;


    isExpanded = (rowIndex) => {
        return indexOf(this.state.expanded, rowIndex) > -1;
    };

    handleToggleExpand = (rowIndex, expand) => {
        if (expand != null && (contains(this.state.expanded, rowIndex)
                               === expand)) {
            return;
        }
        const expanded = toggle(this.state.expanded, rowIndex);
        if (fire(this.props.onExpandToggle, expanded, rowIndex)) {
            this.setState({ expanded, hash: Date.now() });
        }
    };

    render() {
        const {
                  expanded, onExpandToggle, renderItem,
                  expandedHeight, renderBlank, rowHeight, ...props
              } = this.props;


        return <Scroller {...props}
                         hash={this.state.hash}
                         rowHeight={this.rowHeight}
                         renderItem={this.renderItem}
                         renderBlank={this.renderBlank}/>
    }


}
