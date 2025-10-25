// Natural language command parser for converting text to structured commands
export interface ParsedCommand {
  command: string
  device: string
  params?: Record<string, any>
}

export function parseCommand(text: string): ParsedCommand | null {
  const normalizedText = text.toLowerCase().trim()

  // Device patterns
  const devicePatterns = {
    light: /(?:light|lamp|bulb)s?\s*(?:in\s+)?(?:the\s+)?(\w+(?:\s+\w+)?)/,
    thermostat: /(?:thermostat|temperature|temp|heating|cooling)/,
    lock: /(?:lock|door)s?\s*(?:on\s+)?(?:the\s+)?(\w+(?:\s+\w+)?)?/,
    camera: /(?:camera|cam)s?\s*(?:in\s+)?(?:the\s+)?(\w+(?:\s+\w+)?)?/,
    sensor: /(?:sensor)s?\s*(?:in\s+)?(?:the\s+)?(\w+(?:\s+\w+)?)?/,
  }

  // Command patterns
  const commandPatterns = {
    turn_on: /(?:turn\s+on|switch\s+on|enable|activate)/,
    turn_off: /(?:turn\s+off|switch\s+off|disable|deactivate)/,
    set_brightness: /(?:dim|brighten|set.*brightness|brightness.*to)/,
    set_temperature: /(?:set.*(?:temperature|temp)|temperature.*to|temp.*to)/,
    lock: /(?:lock)/,
    unlock: /(?:unlock)/,
    status: /(?:status|state|check)/,
  }

  // Extract device type and location
  let deviceType = "unknown"
  let deviceLocation = "unknown"

  for (const [type, pattern] of Object.entries(devicePatterns)) {
    const match = normalizedText.match(pattern)
    if (match) {
      deviceType = type
      deviceLocation = match[1] || "main"
      break
    }
  }

  // Extract command
  let commandType = "unknown"
  for (const [cmd, pattern] of Object.entries(commandPatterns)) {
    if (pattern.test(normalizedText)) {
      commandType = cmd
      break
    }
  }

  // Extract parameters
  const params: Record<string, any> = {}

  // Brightness extraction
  const brightnessMatch = normalizedText.match(/(?:to\s+)?(\d+)(?:\s*%|\s*percent)/)
  if (brightnessMatch && (commandType === "set_brightness" || commandType === "turn_on")) {
    params.brightness = Number.parseInt(brightnessMatch[1])
    if (commandType === "turn_on") commandType = "set_brightness"
  }

  // Temperature extraction
  const tempMatch = normalizedText.match(/(?:to\s+)?(\d+)(?:\s*degrees?|\s*°)/)
  if (tempMatch && (commandType === "set_temperature" || deviceType === "thermostat")) {
    params.temperature = Number.parseInt(tempMatch[1])
    if (commandType === "unknown") commandType = "set_temperature"
  }

  // Color extraction
  const colorMatch = normalizedText.match(
    /(?:to\s+)?(?:color\s+)?(red|blue|green|yellow|white|warm|cool|purple|pink|orange)/,
  )
  if (colorMatch && deviceType === "light") {
    params.color = colorMatch[1]
  }

  // Return null if we couldn't parse anything meaningful
  if (deviceType === "unknown" && commandType === "unknown") {
    return null
  }

  // Construct device identifier
  const deviceId = deviceLocation !== "unknown" ? `${deviceLocation}_${deviceType}` : deviceType

  return {
    command: commandType,
    device: deviceId,
    params: Object.keys(params).length > 0 ? params : undefined,
  }
}

// Example usage and test cases
export function testCommandParser() {
  const testCases = [
    "turn on living room light",
    "set bedroom light to 50%",
    "turn off kitchen lights",
    "set thermostat to 72 degrees",
    "lock front door",
    "dim bathroom light to 30%",
    "turn on red living room light",
    "check status of garage door",
  ]

  console.log("Command Parser Test Results:")
  testCases.forEach((command) => {
    const result = parseCommand(command)
    console.log(`"${command}" ->`, result)
  })
}
