import { withStyles } from '@material-ui/core/styles'
import * as React from 'react'
import Session from '../common/session'
import { Label2DList } from '../drawable/label2d_list'
import { getCurrentImageViewerConfig } from '../functional/state_util'
import { State } from '../functional/types'
import { Vector2D } from '../math/vector2d'
import { label2dViewStyle } from '../styles/label'
import {
  clearCanvas,
  getCurrentImageSize,
  imageDataToHandleId,
  MAX_SCALE,
  MIN_SCALE,
  normalizeMouseCoordinates,
  toCanvasCoords,
  UP_RES_RATIO,
  updateCanvasScale
} from '../view/image'
import { Viewer } from './viewer'

interface ClassType {
  /** label canvas */
  label_canvas: string
  /** control canvas */
  control_canvas: string
}

interface Props {
  /** styles */
  classes: ClassType
  /** display */
  display: HTMLDivElement | null
}

/**
 * Canvas Viewer
 */
export class Label2dViewer extends Viewer<Props> {
  /** The label context */
  public labelContext: CanvasRenderingContext2D | null
  /** The control context */
  public controlContext: CanvasRenderingContext2D | null

  /** drawable label list */
  private _labels: Label2DList
  /** The label canvas */
  private labelCanvas: HTMLCanvasElement | null
  /** The control canvas */
  private controlCanvas: HTMLCanvasElement | null
  /** The mask to hold the display */
  private display: HTMLDivElement | null

  // display variables
  /** The current scale */
  private scale: number
  /** The canvas height */
  private canvasHeight: number
  /** The canvas width */
  private canvasWidth: number
  /** The scale between the display and image data */
  private displayToImageRatio: number

  /** UI onr */
  private mouseDownHandler: (e: React.MouseEvent<HTMLCanvasElement>) => void
  /** UI onr */
  private mouseUpHandler: (e: React.MouseEvent<HTMLCanvasElement>) => void
  /** UI onr */
  private mouseMoveHandler: (e: React.MouseEvent<HTMLCanvasElement>) => void
  /** UI onr */
  private keyDownHandler: (e: KeyboardEvent) => void
  /** UI onr */
  private keyUpHandler: (e: KeyboardEvent) => void

  // keyboard and mouse status
  /** The hashed list of keys currently down */
  private _keyDownMap: { [key: string]: boolean }

  /**
   * Constructor, handles subscription to store
   * @param {Object} props: react props
   */
  constructor (props: Readonly<Props>) {
    super(props)

    // constants

    // initialization
    this._keyDownMap = {}
    this.scale = 1
    this.canvasHeight = 0
    this.canvasWidth = 0
    this.displayToImageRatio = 1
    this.controlContext = null
    this.controlCanvas = null
    this.labelContext = null
    this.labelCanvas = null
    this.display = null

    this.mouseDownHandler = this.onMouseDown.bind(this)
    this.mouseUpHandler = this.onMouseUp.bind(this)
    this.mouseMoveHandler = this.onMouseMove.bind(this)
    this.keyDownHandler = this.onKeyDown.bind(this)
    this.keyUpHandler = this.onKeyUp.bind(this)

    this._labels = new Label2DList()
  }

  /**
   * Component mount callback
   */
  public componentDidMount () {
    document.addEventListener('keydown', this.keyDownHandler)
    document.addEventListener('keyup', this.keyUpHandler)
  }

  /**
   * Set the current cursor
   * @param {string} cursor - cursor type
   */
  public setCursor (cursor: string) {
    if (this.labelCanvas !== null) {
      this.labelCanvas.style.cursor = cursor
    }
  }

  /**
   * Set the current cursor to default
   */
  public setDefaultCursor () {
    this.setCursor('crosshair')
  }

  /**
   * Render function
   * @return {React.Fragment} React fragment
   */
  public render () {
    const { classes } = this.props
    let controlCanvas = (<canvas
      key='control-canvas'
      className={classes.control_canvas}
      ref={(canvas) => {
        if (canvas && this.display) {
          this.controlCanvas = canvas
          this.controlContext = canvas.getContext('2d')
          const displayRect =
            this.display.getBoundingClientRect()
          if (displayRect.width
            && displayRect.height
            && this.controlContext) {
            this.updateScale(this.controlCanvas, this.controlContext, true)
          }
        }
      }}
    />)
    let labelCanvas = (<canvas
      key='label-canvas'
      className={classes.label_canvas}
      ref={(canvas) => {
        if (canvas && this.display) {
          this.labelCanvas = canvas
          this.labelContext = canvas.getContext('2d')
          const displayRect =
            this.display.getBoundingClientRect()
          if (displayRect.width
            && displayRect.height
            && this.labelContext) {
            this.updateScale(this.labelCanvas, this.labelContext, true)
          }
        }
      }}
      onMouseDown={this.mouseDownHandler} onMouseUp={this.mouseUpHandler}
      onMouseMove={this.mouseMoveHandler}
    />)

    if (this.display) {
      const displayRect = this.display.getBoundingClientRect()
      controlCanvas = React.cloneElement(controlCanvas,
         { height: displayRect.height, width: displayRect.width })
      labelCanvas = React.cloneElement(labelCanvas,
         { height: displayRect.height, width: displayRect.width })
    }

    return [controlCanvas, labelCanvas]
  }

  /**
   * Function to redraw all canvases
   * @return {boolean}
   */
  public redraw (): boolean {
    if (this.labelCanvas !== null && this.labelContext !== null &&
      this.controlCanvas !== null && this.controlContext !== null) {
      clearCanvas(this.labelCanvas, this.labelContext)
      clearCanvas(this.controlCanvas, this.controlContext)
      this._labels.redraw(this.labelContext, this.controlContext,
        this.displayToImageRatio * UP_RES_RATIO)
    }
    return true
  }

  /**
   * notify state is updated
   */
  protected updateState (state: State): void {
    this.display = this.props.display
    this._labels.updateState(state, state.user.select.item)
  }

  /**
   * Get the mouse position on the canvas in the image coordinates.
   * @param {MouseEvent | WheelEvent} e: mouse event
   * @return {Vector2D}
   * mouse position (x,y) on the canvas
   */
  private getMousePos (e: React.MouseEvent<HTMLCanvasElement>): Vector2D {
    if (this.display && this.labelCanvas) {
      return normalizeMouseCoordinates(
        this.display,
        this.labelCanvas,
        this.canvasWidth,
        this.canvasHeight,
        this.displayToImageRatio,
        e.clientX,
        e.clientY
      )
    }
    return new Vector2D(0, 0)
  }

  /**
   * Get the label under the mouse.
   * @param {Vector2D} mousePos: position of the mouse
   * @return {number[]}
   */
  private fetchHandleId (mousePos: Vector2D): number[] {
    if (this.controlContext) {
      const [x, y] = toCanvasCoords(mousePos, true, this.displayToImageRatio)
      const data = this.controlContext.getImageData(x, y, 4, 4).data
      return imageDataToHandleId(data)
    } else {
      return [-1, 0]
    }
  }

  /**
   * Callback function when mouse is down
   * @param {MouseEvent} e - event
   */
  private onMouseDown (e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button !== 0) {
      return
    }
    // Control + click for dragging
    if (!this.isKeyDown('Control')) {
      // get mouse position in image coordinates
      const mousePos = this.getMousePos(e)
      const [labelIndex, handleIndex] = this.fetchHandleId(mousePos)
      if (this._labels.onMouseDown(mousePos, labelIndex, handleIndex)) {
        e.stopPropagation()
      }
    }
    this.redraw()
  }

  /**
   * Callback function when mouse is up
   * @param {MouseEvent} e - event
   */
  private onMouseUp (e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button !== 0) {
      return
    }

    const mousePos = this.getMousePos(e)
    const [labelIndex, handleIndex] = this.fetchHandleId(mousePos)
    this._labels.onMouseUp(mousePos, labelIndex, handleIndex)
    this.redraw()
  }

  /**
   * Callback function when mouse moves
   * @param {MouseEvent} e - event
   */
  private onMouseMove (e: React.MouseEvent<HTMLCanvasElement>) {
    // TODO: update hovered label
    // grabbing image
    if (!this.isKeyDown('Control')) {
      this.setDefaultCursor()
    }

    // update the currently hovered shape
    const mousePos = this.getMousePos(e)
    const [labelIndex, handleIndex] = this.fetchHandleId(mousePos)
    if (this._labels.onMouseMove(
      mousePos, getCurrentImageSize(), labelIndex, handleIndex)) {
      e.stopPropagation()
      this.redraw()
    }
  }

  /**
   * Callback function when key is down
   * @param {KeyboardEvent} e - event
   */
  private onKeyDown (e: KeyboardEvent) {
    const key = e.key
    this._keyDownMap[key] = true
  }

  /**
   * Callback function when key is up
   * @param {KeyboardEvent} e - event
   */
  private onKeyUp (e: KeyboardEvent) {
    const key = e.key
    delete this._keyDownMap[key]
    if (key === 'Control' || key === 'Meta') {
      // Control or command
      this.setDefaultCursor()
    }
  }

  /**
   * Whether a specific key is pressed down
   * @param {string} key - the key to check
   * @return {boolean}
   */
  private isKeyDown (key: string): boolean {
    return this._keyDownMap[key]
  }

  /**
   * Set the scale of the image in the display
   * @param {object} canvas
   * @param {boolean} upRes
   */
  private updateScale (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    upRes: boolean
  ) {
    if (!this.display) {
      return
    }
    const state = Session.getState()
    const config =
      getCurrentImageViewerConfig(state)

    if (config.viewScale < MIN_SCALE || config.viewScale >= MAX_SCALE) {
      return
    }
    (
      [
        this.canvasWidth,
        this.canvasHeight,
        this.displayToImageRatio,
        this.scale
      ] =
      updateCanvasScale(
        this.display,
        canvas,
        context,
        config,
        config.viewScale / this.scale,
        upRes
      )
    )
  }
}

export default withStyles(label2dViewStyle, { withTheme: true })(Label2dViewer)
