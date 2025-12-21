/**
 * @typedef {Object} Player
 * @property {number} x - X position on canvas
 * @property {number} y - Y position on canvas
 * @property {string} team - Team identifier ('A' or 'B')
 * @property {number} number - Player jersey number
 * @property {string} role - Player role (e.g., 'forward', 'back') - Optional
 * @property {string} color - Player color (hex or css string)
 * @property {boolean} visible - Whether the player is visible
 * @property {number} radius - Player radius for rendering/collision
 */

/**
 * @typedef {Object} Ball
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {string} state - Current state of the ball ('ground', 'pass', 'kick')
 * @property {string} color - Ball color
 */

/**
 * @typedef {Object} Arrow
 * @property {string} type - Arrow type ('normal', 'kick', 'pass')
 * @property {number} x1 - Start X
 * @property {number} y1 - Start Y
 * @property {number} x2 - End X
 * @property {number} y2 - End Y
 * @property {string} color - Arrow color
 */

/**
 * @typedef {Object} Zone
 * @property {number} x1 - Top-Left X
 * @property {number} y1 - Top-Left Y
 * @property {number} x2 - Bottom-Right X
 * @property {number} y2 - Bottom-Right Y
 * @property {string} name - Zone name
 * @property {string} color - Zone background color (rgba)
 * @property {boolean} locked - Whether the zone is locked
 */

/**
 * @typedef {Object} Frame
 * @property {number} id - Unique frame ID
 * @property {Player[]} players - List of players in this frame
 * @property {Ball} ball - State of the ball
 * @property {Array<Object>} props - Additional props (cones, posts)
 * @property {Arrow[]} arrows - List of arrows
 * @property {Zone[]} zones - List of zones
 * @property {string} comment - Description of the frame step
 * @property {number} duration - Duration of this frame in animation (ms)
 * @property {Array} drawings - Freehand drawings
 * @property {Array} trailLines - Movement trails
 * @property {Array} trainingShields - Training shields
 */

/**
 * @typedef {Object} FieldConfig
 * @property {'full' | 'half'} type - Field type
 * @property {'horizontal' | 'vertical'} orientation - Field orientation
 * @property {'top' | 'bottom'} [halfSide] - Which half is visible (for 'half' type)
 */

/**
 * @typedef {Object} AppState
 * @property {string} mode - Current application mode
 * @property {FieldConfig} fieldConfig - Current field configuration
 * @property {Frame[]} frames - Array of animation frames
 * @property {number} currentFrameIndex - Index of the actively displayed frame
 * @property {Set<Player>} selectedPlayers - Set of currently selected players
 * @property {Zone|null} selectedZone - Currently selected zone
 * @property {boolean} isPlaying - Whether animation is playing
 */

export const Types = {}; // Empty export to make it a module
