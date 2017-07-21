import React, { PureComponent } from 'react';
import Scroller from '../Scroller';
import ExpandableScroller from '../ExpandableScroller';
import {
    arrayOf, string, oneOf, any, func, shape, object,
} from 'prop-types';
import { columnPropTypes } from './Column';
import {
    classes, result, numberOrFunc, ignoreKeys, toString, toggle, fire
} from '../util';
import ColumnDefault from './Column';
import { theme, themeClass } from '../themes'
import IndeterminateCheckbox from './IndeterminateCheckbox';
import Cell from './Cell';
import Row from './Row';

export const tablePropTypes = {
    rowClassName    : string,
    columns         : arrayOf(shape(columnPropTypes)),
    rowRender       : func,
    headerRender    : func,
    className       : string,
    renderItem      : func,
    renderSelectable: func,
    onRowSelect     : func,
    //If all all are selected, other wise an array of selected
    selected        : arrayOf(any),
    selectedState   : oneOf(['ALL', 'INDETERMINATE'])
};

const ignore = ignoreKeys(tablePropTypes);


const Selectable       = ({ rowIndex, width, state, data, onSelect, className }) => {
    return <IndeterminateCheckbox rowIndex={rowIndex} state={state}
                                  data={data}
                                  onSelect={onSelect}/>

};
Selectable.displayName = 'Selectable';

export default class TableScroller extends PureComponent {

    static propTypes = {
        ...tablePropTypes,
        expandedHeight: numberOrFunc,
        renderItem    : func,
    };

    static defaultProps = {
        columns         : [],
        rowRender       : Row,
        renderCell      : Cell,
        headerRender    : ColumnDefault,
        renderSelectable: Selectable,
        selectState     : 'INDETERMINATE',
        selected        : []
    };

    state = {
        columns              : this.props.columns,
        columnsHash          : Date.now(),
        selected             : this.props.selected,
        selectState          : this.props.selectState,
        isContainerExpandable: this.props.expandedContent != null,
    };


    componentWillReceiveProps({ columns, selected, expandedContent }) {
        const state = {};
        if (this.props.columns !== columns) {
            state.columns = columns;
            if (this.state.columns !== columns) {
                state.columnHash = Date.now();
                this._blanks     = null;
            }
        }
        if (this.props.selected != selected) {
            state.selected = selected;
            if (this.state.selected !== selected) {
                state.selectedHash = Date.now();
            }
        }
        if (this.props.expandedContent != expandedContent) {
            state.isContainerExpandable = expandedContent != null;
        }
        this.setState(state);
    }


    handleSort = (sortIndex) => {
        const sortDirection = this.state.sortDirection === 'ASC' ? 'DESC'
            : 'ASC';
        if (fire(this.props.onSort, this.state.columns[sortIndex],
                sortDirection)) {
            this.setState({ sortIndex, sortDirection, hash: Date.now() });
        }
    };

    handleColumnConfigChange = (columnIndex, config) => {

        if (fire(this.props.onColumnConfigChange, columnIndex, config)) {
            const [...columns] = this.state.columns;

            columns[columnIndex] =
                Object.assign({}, columns[columnIndex], config);
            this.setState({ columns, columnHash: Date.now() });
        }
    };

    handleIndeterminateSelection = (data) => {
        let selectState;
        switch (this.state.selectState) {

            case 'ALL':
                selectState = 'INDETERMINATE';
                break;
            case 'INDETERMINATE':
                selectState = 'ALL';
                break;
        }
        if (fire(this.props.onRowSelect, selectState)) {
            this.setState({ selectState, selected: [] })
        }

    };

    isSelected(data) {
        if (this.state.selectState === 'ALL') {
            if (this.state.selected.length == 0) {
                return 'checked';
            }
            if (this.state.selected.indexOf(data) == -1) {
                return 'checked';
            } else {
                return 'unchecked';
            }
        }

        return this.state.selected.indexOf(data) !== -1 ? 'checked'
            : 'unchecked';

    }

    handleRowSelection = (data, select) => {
        let selected    = toggle(this.state.selected, data),
            selectState = this.state.selectState;

        const selectedLength = selected.length;
        const rowCount       = result(this.props.rowCount);
        if (selectedLength == rowCount) {
            selectState = 'ALL';
            selected    = [];
        }
        if (fire(this.props.onRowSelect, selectState, selected)) {
            this.setState({
                selected,
                selectState
            })
        }

    };


    renderBlankCell({ width, height, className }) {
        return (<div style={{ minWidth: width, maxWidth: width, height }}
                     className={className}>
            <div/>
        </div>);
    }

    renderBlanks() {
        const ret            = [];
        const { columns }    = this.state;
        const blankClassName = tc('blank');

        for (let i = 0, c = 0, l = columns.length; i < l; i++) {
            const { columnKey, width = 100, selectable, height, hidden, renderBlank = this.renderBlankCell } = columns[i];
            if (hidden) {
                continue;
            }

            const Blank = renderBlank;
            ret[c++]    = <Blank key={`cell-blank-${c}`}
                                 width={selectable ? 20 : width}
                                 height={height}
                                 className={blankClassName}/>
        }


        return ret;
    }


    renderItem = (row) => {
        const {
                  rowIndex,
                  height,
                  data,
              }             = row;
        const cells         = [];
        const { columns }   = this.state;
        const cellClassName = 'cell';
        for (let i = 0, c = 0, l = columns.length; i < l; i++) {
            let { columnKey, renderCell, ...config } = columns[i];
            if (config.hidden) {
                continue;
            }
            const cellData = data[columnKey];
            if (config.selectable) {
                config = {
                    ...config,
                    width     : 20,
                    renderCell: this.props.renderSelectable,
                    data      : rowIndex,
                    onSelect  : this.handleRowSelection,
                    state     : this.isSelected(cellData)
                }

            }
            const RenderCell = config.renderCell || this.props.renderCell;
            cells[c++]       = <RenderCell {...config}
                                           key={`cell-${c}`}
                                           columnKey={columnKey}

                                           rowIndex={rowIndex}
                                           colIndex={i}
                                           height={height}
                                           className={cellClassName}
                                           data={cellData}/>
        }

        const RowRender = this.props.rowRender;
        const cfg       = {};
        if (this.state.isContainerExpandable) {
            cfg.isExpanded      = row.isExpanded;
            cfg.expandedContent = this.props.expandedContent;
            cfg.onToggle        = row.onToggle;
            cfg.className       = 'expandable';
        } else {
            cfg.className = 'row';
        }
        return <RowRender  {...cfg}
                           data={row.data}
                           rowHeight={row.rowHeight}
                           rowIndex={row.rowIndex}>{cells}</RowRender>

    };

    renderBlank = (row) => {
        if (this._blanks) {
            return this._blanks
        }
        return (this._blanks = <div className={tc('row')}
                                    style={{ height: row.rowHeight }}>
            {this.renderBlanks(row)}
        </div>);
    };


    selectState() {
        const { selectState, selected: { length } } = this.state;
        const rowCount                              = result(
            this.props.rowCount);
        if (selectState == 'ALL') {
            if (length == 0) {
                return 'ALL';
            }
        }
        if (length === rowCount) {
            return 'ALL';
        }
        if (length === 0) {
            return 'NONE';
        }
        return 'INDETERMINATE';
    }

    rowData = (rowIndex, count) => result(this.props.rowData, rowIndex, count, {
        sortColumn   : this.state.columns[this.state.sortIndex],
        sortDirection: this.state.sortDirection
    });

    render() {
        const {
                  columns,
                  isContainerExpandable
              }           = this.state;
        const UseScroller = isContainerExpandable
            ? ExpandableScroller
            : Scroller;

        const Column = this.props.headerRender;
        const cols   = [];
        let rowWidth = 0;
        for (let i = 0, c = 0, l = columns.length; i < l; i++) {
            let col = columns[i];
            if (col.hidden === true) {
                continue;
            }
            if (col.selectable === true) {
                col = {
                    ...col,
                    width    : 20,
                    sortable : false,
                    resizable: false,
                    label    : this.props.renderSelectable,
                    className: tc('cell-header-select'),
                    onSelect : this.handleIndeterminateSelection,
                    state    : this.selectState()
                }
            }
            if (col.sortable !== false) {
                col = {
                    ...col,
                    sortable     : true,
                    sortDirection: (this.state.sortIndex === i
                        ? this.state.sortDirection : null)
                }
            }

            rowWidth += col.width;

            cols[c++] = <Column {...col}
                                columnIndex={i}
                                key={`column-${col.columnKey}-${i}-${c}`}
                                onSort={this.handleSort}
                                onColumnConfigChange={this.handleColumnConfigChange}/>
        }

        return <div className={tc('container')}>
            <UseScroller hash={classes(this.props.hash,
                this.state.columnHash)}
                         {...ignore(this.props)}
                         width={rowWidth}
                         height={this.props.height}
                         className={tc('scroll-rows')}
                         scrollerClassName={tc('scroll-list')}
                         rowData={this.rowData}
                         renderItem={this.renderItem}
                         renderBlank={this.renderBlank}>
                <div key='header-container'
                     className={tc('cell-headers')}>
                    {cols}
                </div>
            </UseScroller>
        </div>
    }
}


const tc = themeClass(TableScroller);