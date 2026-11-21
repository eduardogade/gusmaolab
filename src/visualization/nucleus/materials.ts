/**
 * The nucleus's materials (P19, D-131). Three of them, no textures:
 *
 *   chromatin  one lit, opaque, vertex-coloured material for every polymer, so it never sorts
 *              against itself; depth reads through lighting and a pale fog toward the back.
 *   back, front  two layers of the envelope, translucent, never writing depth: a faint inner
 *              fill and a fresnel rim. They draw after the chromatin, so the strands show
 *              through the envelope and cannot be hidden by a sorting error.
 *
 * Colours come from config.ts and are the object's own, not site tokens (D-131).
 */
import { BackSide, Color, FrontSide, MeshStandardMaterial, ShaderMaterial, SRGBColorSpace } from "three"
import { ENVELOPE_FILL, ENVELOPE_RIM } from "./config.ts"

const linear = (rgb: readonly [number, number, number]): Color => new Color().setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace)

export function chromatinMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0, fog: true })
}

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uRim;
  uniform vec3 uFill;
  uniform float uFillAlpha;
  uniform float uRimAlpha;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
    gl_FragColor = vec4(mix(uFill, uRim, f), uFillAlpha + uRimAlpha * f);
    #include <colorspace_fragment>
  }
`

function envelopeLayer(side: typeof BackSide | typeof FrontSide, fillAlpha: number, rimAlpha: number, power: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uRim: { value: linear(ENVELOPE_RIM) },
      uFill: { value: linear(ENVELOPE_FILL) },
      uFillAlpha: { value: fillAlpha },
      uRimAlpha: { value: rimAlpha },
      uPower: { value: power },
    },
    side,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
}

/** The envelope seen from inside (a faint fill), and from outside (the rim). */
export const envelopeBack = (): ShaderMaterial => envelopeLayer(BackSide, 0.1, 0.16, 2.4)
export const envelopeFront = (): ShaderMaterial => envelopeLayer(FrontSide, 0.025, 0.62, 2.2)
