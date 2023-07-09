import { createSignal, type Component, onMount, createEffect } from "solid-js"
import * as faceapi from "face-api.js"

import styles from "./App.module.css"

const App: Component = () => {
  const { innerWidth: width, innerHeight: height } = window
  const [modelsLoaded, setModelsLoaded] = createSignal(false)
  const [videoLoaded, setVideoLoaded] = createSignal(false)
  const [isDetectFace, setIsDetectFace] = createSignal(false)
  const [isRunning, setIsRunning] = createSignal(false)

  let eyes: HTMLDivElement | undefined
  let leftEye: HTMLDivElement | undefined
  let rightEye: HTMLDivElement | undefined
  let pupilLeft: HTMLDivElement | undefined
  let pupilRight: HTMLDivElement | undefined
  let video: HTMLVideoElement | undefined
  let canvas: HTMLCanvasElement | undefined

  const faceDetector = new faceapi.TinyFaceDetectorOptions({ inputSize: 256 })
  const displaySize = { width, height }

  const loadModels = async () => {
    const MODEL_URL = "/models"

    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]).then(() => {
      setModelsLoaded(true)
    })
  }

  const run = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
    if (video) {
      video.srcObject = stream
      video.play()
      setVideoLoaded(true)
    }
  }

  const drawFaceBox = (
    detection: faceapi.WithFaceExpressions<{
      detection: faceapi.FaceDetection
    }>
  ) => {
    if (!canvas || !video) return
    if (!width || !height) return

    const canvasContext = canvas.getContext("2d")

    if (canvasContext) {
      faceapi.matchDimensions(canvas, { width, height })

      faceapi.draw.drawDetections(canvas, detection)
      faceapi.draw.drawFaceExpressions(canvas, detection)

      const box = detection.detection.box
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: `${detection.detection.score.toFixed(2)}`,
      })
      drawBox.draw(canvasContext)
    }
  }

  const eyeMove = (
    detection: faceapi.WithFaceExpressions<{
      detection: faceapi.FaceDetection
    }>
  ) => {
    if (!eyes || !leftEye || !rightEye || !pupilLeft || !pupilRight || !width || !height) {
      return
    }

    const faceBox = detection.detection.box
    const faceCenterX = faceBox.x + faceBox.width / 2
    const faceCenterY = faceBox.y + faceBox.height / 2

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    const eyesCenterX = eyes.getBoundingClientRect().left + eyes.offsetWidth / 2
    const eyesCenterY = eyes.getBoundingClientRect().top + eyes.offsetHeight / 2

    const maxPupilOffsetX = 20
    const maxPupilOffsetY = 15
    const pupilOffsetX = ((faceCenterX - eyesCenterX) / windowWidth) * maxPupilOffsetX
    const pupilOffsetY = ((faceCenterY - eyesCenterY) / windowHeight) * maxPupilOffsetY

    pupilLeft.style.transform = `translate(-50%, -50%) translate(${pupilOffsetX}px, ${pupilOffsetY}px)`
    pupilRight.style.transform = `translate(-50%, -50%) translate(${pupilOffsetX}px, ${pupilOffsetY}px)`
  }

  async function runFaceTracking() {
    if (!video) return

    try {
      const detections = await faceapi.detectSingleFace(video, faceDetector).withFaceExpressions()

      if (detections) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        if (!isDetectFace()) {
          setIsDetectFace(true)
        }

        // drawFaceBox(resizedDetections)
        eyeMove(resizedDetections)
      } else {
        setIsDetectFace(false)
      }
    } catch (error) {
      console.log("Error", error)
    }
    requestAnimationFrame(runFaceTracking)
  }

  onMount(async () => {
    await loadModels()
    await run()
  })

  createEffect(async () => {
    if (
      !modelsLoaded() ||
      !videoLoaded() ||
      !eyes ||
      !leftEye ||
      !rightEye ||
      !pupilLeft ||
      !pupilRight ||
      !width ||
      !height ||
      !video
    ) {
      return
    }

    const int = setInterval(async () => {
      if (!video) return
      const detector = await faceapi.detectSingleFace(video, faceDetector).withFaceExpressions()
      if (detector && !isRunning()) {
        console.log("ggg")
        clearInterval(int)
        runFaceTracking()
        setIsRunning(true)
      }
    }, 100)
  })

  return (
    <div class={styles.App}>
      <div class={styles.container}>
        <div class={isDetectFace() ? styles.faceDetected : styles.faceNotDetected} />
        <div class={styles.face}>
          <div class={styles.eyes} ref={eyes} style={{ transform: "rotateY(180deg)" }}>
            <div class={`${styles.eye} ${!isDetectFace() ? styles.closeEye : ""}`} ref={leftEye}>
              {/* <div class={styles.eyelidTop} ref={eyelidLeftTop} />
              <div class={styles.eyelidBottom} ref={eyelidLeftBottom} /> */}
              <div ref={pupilLeft} class={styles.pupil} />
            </div>
            <div class={`${styles.eye} ${!isDetectFace() ? styles.closeEye : ""}`} ref={rightEye}>
              {/* <div class={styles.eyelidTop} ref={eyelidRightTop} />
              <div class={styles.eyelidBottom} ref={eyelidRightBottom} /> */}
              <div ref={pupilRight} class={styles.pupil} />
            </div>
          </div>
        </div>
        <div class={styles.video}>
          <video height={height} width={width} ref={video} autoplay muted />
          <canvas ref={canvas} class={styles.canvas} height={height} width={width} />
        </div>
      </div>
    </div>
  )
}

export default App
