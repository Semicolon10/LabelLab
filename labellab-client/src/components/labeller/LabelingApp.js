import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
// import Hotkeys from 'react-hot-keys';
import update from 'immutability-helper'

import 'semantic-ui-css/semantic.min.css'

import Canvas from './Canvas'
// import HotkeysPanel from './HotkeysPanel';
import Sidebar from './Sidebar'
// import { PathToolbar, MakePredictionToolbar } from './CanvasToolbar';
// import Reference from './Reference';
import './css/LabelingApp.css'

import { genId, colors } from './utils'
// import { computeTrace } from "./tracing";
import { withHistory } from './LabelingAppHistoryHOC'
import { withLoadImageData } from './LoadImageDataHOC'

/*
 type Figure = {
   type: 'bbox' | 'polygon';
   points: [{ lat: Number, lng: Number }];
   ?color: Color;
 };
*/

class LabelingApp extends Component {
  constructor(props) {
    super(props)
    const { labels } = props
    const toggles = {}
    labels.map(label => (toggles[label.id] = true))

    this.state = {
      selected: null,
      toggles,

      selectedFigureId: null,

      // UI
      reassigning: { status: false, type: null },
      hotkeysPanel: false
    }

    this.canvasRef = React.createRef()
  }

  handleSelected = selected => {
    if (selected === this.state.selected) return
    const { pushState } = this.props

    if (!selected) {
      pushState(
        state => ({
          unfinishedFigure: null
        }),
        () => this.setState({ selected })
      )
      return
    }

    const { labels } = this.props

    const labelIdx = labels.findIndex(label => label.id === selected)
    const type = labels[labelIdx].type
    const color = colors[labelIdx]

    pushState(
      state => ({
        unfinishedFigure: {
          id: null,
          color,
          type,
          points: []
        }
      }),
      () => this.setState({ selected })
    )
  }

  handleSelectionChange = figureId => {
    if (figureId) {
      this.setState({ selectedFigureId: figureId })
    } else {
      this.setState({
        reassigning: { status: false, type: null },
        selectedFigureId: null
      })
    }
  }

  handleChange = (eventType, figure, newLabelId) => {
    if (!figure.color) return
    // const { labels, figures, pushState, height, width, imageData } = this.props;
    const { labels, figures, pushState } = this.props
    const label =
      figure.color === 'gray'
        ? { id: '__temp' }
        : labels[colors.indexOf(figure.color)]
    const idx = (figures[label.id] || []).findIndex(f => f.id === figure.id)

    switch (eventType) {
      case 'new':
        pushState(
          state => ({
            figures: update(state.figures, {
              [label.id]: {
                $push: [
                  {
                    id: figure.id || genId(),
                    type: figure.type,
                    points: figure.points
                  }
                ]
              }
            }),
            unfinishedFigure: null
          }),
          () =>
            this.setState({
              selected: null
            })
        )
        break

      // case "replace":
      //   pushState(state => {
      //     let { tracingOptions } = figure;
      //     if (tracingOptions && tracingOptions.enabled) {
      //       const imageInfo = {
      //         height,
      //         width,
      //         imageData
      //       };
      //       tracingOptions = {
      //         ...tracingOptions,
      //         trace: computeTrace(figure.points, imageInfo, tracingOptions)
      //       };
      //     } else {
      //       tracingOptions = { ...tracingOptions, trace: [] };
      //     }

      //     return {
      //       figures: update(state.figures, {
      //         [label.id]: {
      //           $splice: [
      //             [
      //               idx,
      //               1,
      //               {
      //                 id: figure.id,
      //                 type: figure.type,
      //                 points: figure.points,
      //                 tracingOptions
      //               }
      //             ]
      //           ]
      //         }
      //       })
      //     };
      //   });
      // break;

      case "replace":
        pushState(
          state => {
          return {
            figures: update(state.figures, {
              [label.id]: {
                $splice: [
                  [
                    idx,
                    1,
                    {
                      id: figure.id,
                      type: figure.type,
                      points: figure.points
                    }
                  ]
                ]
              }
            })
          };
        });
      break


      case 'delete':
        pushState(state => ({
          figures: update(state.figures, {
            [label.id]: {
              $splice: [[idx, 1]]
            }
          })
        }))
        break

      case 'unfinished':
        pushState(
          state => ({ unfinishedFigure: figure }),
          () => {
            const { unfinishedFigure } = this.props
            const { type, points } = unfinishedFigure
            if (type === 'bbox' && points.length >= 2) {
              this.handleChange('new', unfinishedFigure)
            }
          }
        )
        break

      case 'recolor':
        if (label.id === newLabelId) return
        pushState(state => ({
          figures: update(state.figures, {
            [label.id]: {
              $splice: [[idx, 1]]
            },
            [newLabelId]: {
              $push: [
                {
                  id: figure.id,
                  points: figure.points,
                  type: figure.type,
                  tracingOptions: figure.tracingOptions
                }
              ]
            }
          })
        }))
        break

      default:
        throw new Error('unknown event type ' + eventType)
    }
  }

  render() {
    const {
      labels,
      imageUrl,
      projectUrl,
      // reference,
      onBack,
      onSkip,
      onSubmit,
      pushState,
      // popState,
      figures,
      unfinishedFigure,
      height,
      width,
      models,
      makePrediction
    } = this.props
    const {
      selected,
      // selectedFigureId,
      reassigning,
      toggles
      // hotkeysPanel
    } = this.state

    const forwardedProps = {
      onBack,
      onSkip,
      onSubmit,
      models,
      makePrediction
    }
    const sidebarProps = reassigning.status
      ? {
          title: 'Select the new label',
          selected: null,
          onSelect: selected => {
            const figure = this.canvasRef.current.getSelectedFigure()
            if (figure) {
              this.handleChange('recolor', figure, selected)
            }

            this.setState({ reassigning: { status: false, type: null } })
          },
          filter: label => label.type === reassigning.type,
          labelData: figures
        }
      : {
          title: 'Labeling',
          selected,
          onSelect: this.handleSelected,
          toggles,
          onToggle: label =>
            this.setState({
              toggles: update(toggles, {
                [label.id]: { $set: !toggles[label.id] }
              })
            }),
          openHotkeys: () => this.setState({ hotkeysPanel: true }),
          onFormChange: (labelId, newValue) =>
            pushState(state => ({
              figures: update(figures, { [labelId]: { $set: newValue } })
            })),
          labelData: figures,
          onHome: () => this.props.history.push(projectUrl)
        }
    // let selectedFigure = null;
    const allFigures = []
    labels.forEach((label, i) => {
      figures[label.id].forEach(figure => {
        if (
          toggles[label.id] &&
          (label.type === 'bbox' || label.type === 'polygon')
        ) {
          allFigures.push({
            color: colors[i],
            points: figure.points,
            id: figure.id,
            type: figure.type,
            tracingOptions: figure.tracingOptions
          })

          // if (figure.id === selectedFigureId) {
          //   selectedFigure = { ...figure, color: colors[i] };
          // }
        }
      })
    })
    figures.__temp.forEach(figure => {
      allFigures.push({
        color: 'gray',
        ...figure
      })
    })
    return (
      <div
        style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', flex: 1, height: '100%' }}>
          <Sidebar
            labels={labels}
            {...sidebarProps}
            {...forwardedProps}
            style={{ flex: 1, maxWidth: 300 }}
          />
          <div style={{ flex: 4, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', height: '100%' }}>
              <Canvas
                url={imageUrl}
                height={height}
                width={width}
                figures={allFigures}
                unfinishedFigure={unfinishedFigure}
                onChange={this.handleChange}
                onReassignment={type =>
                  this.setState({ reassigning: { status: true, type } })
                }
                onSelectionChange={this.handleSelectionChange}
                ref={this.canvasRef}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default withLoadImageData(withRouter(withHistory(LabelingApp)))
