import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        let controller = UIViewController()
        controller.view = TouchView()
        window.rootViewController = controller
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

final class TouchView: UIView {
    private let clock = ProcessInfo.processInfo
    private let label = UILabel()
    private let address = UITextField()
    private let status = UILabel()
    private let connectButton = UIButton(type: .system)
    private let names = ["Index", "Middle", "Ring", "Pinky", "Thumb"]
    private var pads: [UILabel] = []
    private let settings = UIControl()
    private let gear = UIButton(type: .system)
    private let stateLabel = UILabel()
    private let guide = UILabel()
    private var controls: [UIView] = []
    // Stored in Safari's order: Thumb, Index, Middle, Ring, Pinky.
    private var centers: [CGPoint] = []
    private var draft: [CGPoint] = []
    private var pending: (id: ObjectIdentifier, point: CGPoint)?
    private var previousSize = CGSize.zero
    private let colors: [UIColor] = [
        UIColor(red: 24/255, green: 225/255, blue: 167/255, alpha: 1),
        UIColor(red: 35/255, green: 169/255, blue: 1, alpha: 1),
        UIColor(red: 172/255, green: 101/255, blue: 1, alpha: 1),
        UIColor(red: 1, green: 177/255, blue: 45/255, alpha: 1),
        UIColor(red: 1, green: 75/255, blue: 137/255, alpha: 1)
    ]
    private var socket: URLSessionWebSocketTask?
    private var heartbeat: Timer?
    private var connected = false
    private var sequence = 0
    private var active: [ObjectIdentifier: Int] = [:]
    private var arrivals: [Int: Double] = [:]
    private var positions: [ObjectIdentifier: (id: Int, point: CGPoint)] = [:]
    private var positionID = 0
    private var callbackID = 0
    private var touchID = 0
    private var firstTouch: TimeInterval?
    private var firstHandler: TimeInterval?
    private var rows: [(callback: Int, count: Int, id: Int, touch: Double, handler: Double)] = []

    init() {
        super.init(frame: .zero)
        backgroundColor = UIColor(red: 21/255, green: 18/255, blue: 44/255, alpha: 1)
        overrideUserInterfaceStyle = .dark
        isMultipleTouchEnabled = true
        if let saved = UserDefaults.standard.array(forKey: "handCalibration") as? [[Double]],
           saved.count == 5, saved.allSatisfy({ $0.count == 2 }) {
            centers = saved.map { CGPoint(x: $0[0], y: $0[1]) }
        }
        for name in names {
            let pad = UILabel()
            pad.text = "● " + name
            pad.textAlignment = .center
            pad.font = .systemFont(ofSize: 12)
            pad.textColor = .white
            pad.layer.cornerRadius = 15
            pad.layer.masksToBounds = true
            pad.layer.borderWidth = 1
            addSubview(pad)
            pads.append(pad)
        }
        guide.numberOfLines = 0
        guide.textColor = UIColor(white: 0.9, alpha: 1)
        guide.font = .systemFont(ofSize: 14)
        addSubview(guide)
        gear.setImage(UIImage(systemName: "gearshape"), for: .normal)
        gear.tintColor = .white
        gear.accessibilityLabel = "Settings and calibration"
        gear.addTarget(self, action: #selector(toggleSettings), for: .touchUpInside)
        addSubview(gear)
        status.text = "Disconnected · tap gear to connect"
        status.font = .systemFont(ofSize: 11)
        status.textColor = .white
        addSubview(status)
        stateLabel.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        stateLabel.textColor = .white
        addSubview(stateLabel)

        settings.backgroundColor = UIColor(red: 21/255, green: 18/255, blue: 44/255, alpha: 0.97)
        settings.layer.cornerRadius = 12
        settings.isHidden = true
        addSubview(settings)
        address.text = "ws://Lofturs-MacBook-Air.local:8765"
        address.borderStyle = .roundedRect
        address.autocapitalizationType = .none
        address.autocorrectionType = .no
        address.keyboardType = .URL
        address.font = .systemFont(ofSize: 12)
        connectButton.setTitle("Connect", for: .normal)
        connectButton.addTarget(self, action: #selector(connect), for: .touchUpInside)
        let copy = UIButton(type: .system)
        copy.setTitle("Copy Results", for: .normal)
        copy.addTarget(self, action: #selector(copyResults), for: .touchUpInside)
        let resetButton = UIButton(type: .system)
        resetButton.setTitle("Reset", for: .normal)
        resetButton.addTarget(self, action: #selector(reset), for: .touchUpInside)
        let calibration = UIButton(type: .system)
        calibration.setTitle("Calibrate", for: .normal)
        calibration.addTarget(self, action: #selector(calibrate), for: .touchUpInside)
        label.numberOfLines = 0
        label.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
        label.textColor = .white
        controls = [address, connectButton, copy, resetButton, calibration]
        for control in controls { settings.addSubview(control) }
        settings.addSubview(label)
        NotificationCenter.default.addObserver(self, selector: #selector(suspend),
            name: UIApplication.willResignActiveNotification, object: nil)
        reset()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        if previousSize != .zero && previousSize != bounds.size { reset(); pending = nil }
        previousSize = bounds.size
        let bottom = bounds.height - safeAreaInsets.bottom - 44
        gear.frame = CGRect(x: safeAreaInsets.left, y: bottom, width: 44, height: 44)
        status.frame = CGRect(x: gear.frame.maxX, y: bottom, width: max(0, bounds.width - gear.frame.maxX - safeAreaInsets.right - 56), height: 44)
        stateLabel.frame = CGRect(x: bounds.width - safeAreaInsets.right - 52, y: bottom, width: 48, height: 44)
        guide.frame = CGRect(x: safeAreaInsets.left + 18, y: safeAreaInsets.top + 72,
                             width: bounds.width - safeAreaInsets.left - safeAreaInsets.right - 36, height: 90)
        settings.frame = CGRect(x: safeAreaInsets.left + 8, y: safeAreaInsets.top + 8,
                                width: bounds.width - safeAreaInsets.left - safeAreaInsets.right - 16,
                                height: max(180, bottom - safeAreaInsets.top - 16))
        let w = settings.bounds.width
        address.frame = CGRect(x: 12, y: 12, width: w - 104, height: 36)
        connectButton.frame = CGRect(x: w - 88, y: 12, width: 76, height: 36)
        for i in 2...4 { controls[i].frame = CGRect(x: 8 + CGFloat(i - 2) * (w - 16) / 3, y: 52, width: (w - 16) / 3, height: 44) }
        label.frame = CGRect(x: 12, y: 104, width: w - 24, height: max(0, settings.bounds.height - 116))
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.6
        positionLabels()
        setNeedsDisplay()
    }

    @objc private func toggleSettings() {
        if settings.isHidden { reset(); pending = nil }
        settings.isHidden.toggle()
        if settings.isHidden { endEditing(true) }
    }

    @objc private func calibrate() {
        reset()
        centers.removeAll()
        sendScreen()
        draft.removeAll()
        pending = nil
        UserDefaults.standard.removeObject(forKey: "handCalibration")
        settings.isHidden = true
        endEditing(true)
        updatePads()
    }

    private func positionLabels() {
        let points = centers.isEmpty ? draft : centers
        for (finger, pad) in pads.enumerated() {
            let index = finger == 4 ? 0 : finger + 1
            pad.isHidden = index >= points.count
            guard index < points.count else { continue }
            let point = points[index]
            let x = min(max(point.x * bounds.width, safeAreaInsets.left + 32), bounds.width - safeAreaInsets.right - 32)
            let y = min(max(point.y * bounds.height, safeAreaInsets.top + 68), bounds.height - safeAreaInsets.bottom - 20)
            pad.frame = CGRect(x: x - 38, y: y - 15, width: 76, height: 30)
        }
        guide.isHidden = !centers.isEmpty
        if centers.isEmpty {
            let name = ["Thumb", "Index", "Middle", "Ring", "Pinky"][min(draft.count, 4)]
            guide.text = "\(draft.count + 1)/5 · Touch with your \(name) finger\n\nRest your hand comfortably. Touch and lift one finger at a time."
        }
    }

    private var pixels: [CGPoint] { centers.map { CGPoint(x: $0.x * bounds.width, y: $0.y * bounds.height) } }

    private func thumbRadius(_ points: [CGPoint]) -> CGFloat {
        let spacing = points.dropFirst().map { hypot($0.x - points[0].x, $0.y - points[0].y) }.min() ?? 0
        return 1.5 * min(48, min(bounds.width, bounds.height) * 0.14, spacing * 0.45)
    }

    private func fingerAt(_ point: CGPoint) -> Int {
        let points = pixels
        if hypot(point.x - points[0].x, point.y - points[0].y) <= thumbRadius(points) { return 4 }
        return (0..<4).min { a, b in
            hypot(point.x - points[a + 1].x, point.y - points[a + 1].y) < hypot(point.x - points[b + 1].x, point.y - points[b + 1].y)
        }!
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let space = CGColorSpaceCreateDeviceRGB()
        for (color, location) in [(UIColor.white.withAlphaComponent(0.188), CGPoint(x: bounds.width * 0.15, y: bounds.height * 0.1)),
                                  (UIColor(red: 110/255, green: 58/255, blue: 191/255, alpha: 0.333), CGPoint(x: bounds.width * 0.8, y: bounds.height * 0.95))] {
            if let gradient = CGGradient(colorsSpace: space, colors: [color.cgColor, color.withAlphaComponent(0).cgColor] as CFArray, locations: [0, 1]) {
                context.drawRadialGradient(gradient, startCenter: location, startRadius: 0,
                    endCenter: location, endRadius: hypot(bounds.width, bounds.height) * 0.65, options: [])
            }
        }
        guard centers.count == 5 else { return }
        let points = pixels
        let radius = thumbRadius(points)
        let thumb = CGRect(x: points[0].x - radius, y: points[0].y - radius, width: radius * 2, height: radius * 2)
        context.saveGState()
        let mask = UIBezierPath(rect: bounds)
        mask.append(UIBezierPath(ovalIn: thumb))
        mask.usesEvenOddFillRule = true
        mask.addClip()
        for finger in 0..<4 {
            let center = points[finger + 1]
            var polygon = [CGPoint.zero, CGPoint(x: bounds.width, y: 0), CGPoint(x: bounds.width, y: bounds.height), CGPoint(x: 0, y: bounds.height)]
            for other in points.dropFirst() where other != center {
                let nx = other.x - center.x, ny = other.y - center.y
                let limit = (other.x * other.x + other.y * other.y - center.x * center.x - center.y * center.y) / 2
                func side(_ p: CGPoint) -> CGFloat { p.x * nx + p.y * ny - limit }
                var clipped: [CGPoint] = []
                for i in polygon.indices {
                    let start = polygon[i], end = polygon[(i + 1) % polygon.count]
                    let a = side(start), b = side(end)
                    if a <= 0 { clipped.append(start) }
                    if (a <= 0) != (b <= 0) {
                        let t = a / (a - b)
                        clipped.append(CGPoint(x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t))
                    }
                }
                polygon = clipped
            }
            let path = UIBezierPath()
            if let first = polygon.first {
                path.move(to: first)
                for point in polygon.dropFirst() { path.addLine(to: point) }
                path.close()
                paint(path, finger: finger)
            }
        }
        context.restoreGState()
        paint(UIBezierPath(ovalIn: thumb), finger: 4)
    }

    private func paint(_ path: UIBezierPath, finger: Int) {
        let held = active.values.contains(finger)
        colors[finger].withAlphaComponent(held ? 1 : 0.72).setFill()
        UIColor.white.withAlphaComponent(held ? 1 : 0.44).setStroke()
        path.lineWidth = held ? 2 : 1.25
        path.lineJoinStyle = .round
        path.fill()
        path.stroke()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func copyResults() {
        UIPasteboard.general.string = label.text
    }

    @objc private func reset() {
        pending = nil
        positions.removeAll(keepingCapacity: true)
        active.removeAll(keepingCapacity: true)
        arrivals.removeAll(keepingCapacity: true)
        if connected { sendState(touch: clock.systemUptime, handler: nil) }
        sendTiming()
        updatePads()
        callbackID = 0
        touchID = 0
        firstTouch = nil
        firstHandler = nil
        rows.removeAll(keepingCapacity: true)
        label.text = "Touch timestamp: —\nHandler-entry timestamp: —\nDifference: — ms\n\nCB   N  ID  Touch ms  Handler ms  Delay ms"
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        let handlerEntry = clock.systemUptime
        callbackID += 1
        // Capture every timestamp before formatting or touching the interface.
        let timestamps = touches.map { $0.timestamp }.sorted()
        guard let earliest = timestamps.first else { return }
        if firstTouch == nil {
            firstTouch = earliest
            firstHandler = handlerEntry
        }
        for timestamp in timestamps {
            touchID += 1
            rows.append((callbackID, touches.count, touchID, timestamp, handlerEntry))
        }
        // Calibration chooses one touch, committed on release, like Safari.
        if centers.isEmpty {
            if pending == nil, let touch = touches.first {
                let point = touch.location(in: self)
                pending = (ObjectIdentifier(touch), CGPoint(x: point.x / bounds.width, y: point.y / bounds.height))
            }
        } else {
            for touch in touches {
                let finger = fingerAt(touch.location(in: self))
                active[ObjectIdentifier(touch)] = finger
                if finger < 4 && arrivals[finger] == nil { arrivals[finger] = touch.timestamp * 1_000 }
            }
        }
        for touch in touches {
            positionID += 1
            positions[ObjectIdentifier(touch)] = (positionID, touch.location(in: self))
        }
        if touches.contains(where: { active[ObjectIdentifier($0)] != nil }) {
            sendState(touch: earliest, handler: handlerEntry)
            sendTiming()
        } else {
            sendScreen()
        }
        updatePads()
        if rows.count > 10 { rows.removeFirst(rows.count - 10) }

        var text = String(format: "Touch timestamp: %.3f ms\nHandler-entry timestamp: %.3f ms\nDifference: %.3f ms\nCallback %d: %d touches\n\n",
                          earliest * 1_000, handlerEntry * 1_000,
                          (handlerEntry - earliest) * 1_000, callbackID, touches.count)
        text += "CB   N  ID  Touch ms  Handler ms  Delay ms\n"
        for row in rows {
            text += String(format: "%3d %2d %3d %9.3f %10.3f %9.3f\n",
                           row.callback, row.count, row.id,
                           (row.touch - firstTouch!) * 1_000,
                           (row.handler - firstHandler!) * 1_000,
                           (row.handler - row.touch) * 1_000)
        }
        // Exactly one interface update per callback, after recording all fingers.
        label.text = text
        setNeedsLayout()
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        var changed = false
        for touch in touches {
            let key = ObjectIdentifier(touch)
            if let previous = positions[key] {
                let point = touch.location(in: self)
                if point != previous.point {
                    positions[key] = (previous.id, point)
                    changed = true
                }
            }
        }
        // Coordinates only: moving never reassigns fingers or sends note changes.
        if changed { sendScreen() }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        let handlerEntry = clock.systemUptime
        endTouches(touches, handler: handlerEntry, commit: true)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        let handlerEntry = clock.systemUptime
        endTouches(touches, handler: handlerEntry, commit: false)
    }

    private func endTouches(_ touches: Set<UITouch>, handler: Double, commit: Bool) {
        if let pending = pending, touches.contains(where: { ObjectIdentifier($0) == pending.id }) {
            self.pending = nil
            if commit && centers.isEmpty {
                let point = pending.point
                let tooClose = draft.contains { hypot(($0.x - point.x) * bounds.width, ($0.y - point.y) * bounds.height) < 24 }
                if !tooClose {
                    draft.append(point)
                    if draft.count == 5 {
                        centers = draft
                        UserDefaults.standard.set(centers.map { [Double($0.x), Double($0.y)] }, forKey: "handCalibration")
                    }
                }
            }
        }
        for touch in touches { positions.removeValue(forKey: ObjectIdentifier(touch)) }
        let tracked = touches.filter { active[ObjectIdentifier($0)] != nil }
        for touch in tracked { active.removeValue(forKey: ObjectIdentifier(touch)) }
        if let timestamp = tracked.map({ $0.timestamp }).min() {
            sendState(touch: timestamp, handler: handler)
        } else {
            sendScreen()
        }
        updatePads()
    }

    private func updatePads() {
        for (index, pad) in pads.enumerated() {
            let held = active.values.contains(index)
            pad.backgroundColor = UIColor(red: 21/255, green: 18/255, blue: 44/255, alpha: held ? 0.6 : 0.33)
            pad.layer.borderColor = UIColor.white.withAlphaComponent(held ? 1 : 0.25).cgColor
        }
        let state = active.values.reduce(0) { $0 | (1 << $1) } & 15
        stateLabel.text = String(repeating: "0", count: 4 - String(state, radix: 2).count) + String(state, radix: 2)
        positionLabels()
        setNeedsDisplay()
    }

    @objc private func connect() {
        suspend()
        endEditing(true)
        guard let url = URL(string: address.text ?? ""),
              ["ws", "wss"].contains(url.scheme), url.host != nil else {
            status.text = "Enter ws://Mac-hostname.local:8765"
            return
        }
        let task = URLSession.shared.webSocketTask(with: url)
        socket = task
        sequence = 0
        status.text = "Connecting…"
        task.resume()
        send(["role": "controller"])
        receive(task)
    }

    @objc private func suspend() {
        pending = nil
        heartbeat?.invalidate()
        heartbeat = nil
        connected = false
        socket?.cancel(with: .goingAway, reason: nil)
        socket = nil
        positions.removeAll()
        active.removeAll()
        arrivals.removeAll()
        updatePads()
        status.text = "Disconnected · tap Connect"
    }

    private func send(_ message: [String: Any]) {
        guard let task = socket,
              let data = try? JSONSerialization.data(withJSONObject: message),
              let text = String(data: data, encoding: .utf8) else { return }
        task.send(.string(text)) { [weak self] error in
            if let error = error {
                DispatchQueue.main.async { self?.failed(task, error: error) }
            }
        }
    }

    private func failed(_ task: URLSessionWebSocketTask, error: Error) {
        guard socket === task else { return }
        let reason = task.closeReason.flatMap { String(data: $0, encoding: .utf8) }
        suspend()
        status.text = "Disconnected: \(reason ?? error.localizedDescription) · tap Connect"
    }

    private func receive(_ task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self, self.socket === task else { return }
                switch result {
                case .failure(let error): self.failed(task, error: error)
                case .success(let message):
                    let data: Data?
                    switch message {
                    case .string(let text): data = text.data(using: .utf8)
                    case .data(let value): data = value
                    @unknown default: data = nil
                    }
                    if let data = data,
                       let value = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
                        if value["type"] as? String == "status", value["controllerConnected"] as? Bool == true {
                            if !self.connected {
                                self.positions.removeAll()
                                self.active.removeAll()
                                self.arrivals.removeAll()
                                self.connected = true
                                self.sendState(touch: self.clock.systemUptime, handler: nil)
                                self.sendTiming()
                                self.heartbeat = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                                    self?.send(["type": "heartbeat"])
                                }
                                self.updatePads()
                            }
                            self.status.text = "Connected · native UIKit"
                        } else if value["type"] as? String == "timing-reset" {
                            self.arrivals.removeAll()
                            self.sendTiming()
                        }
                    }
                    self.receive(task)
                }
            }
        }
    }

    private func sendState(touch: Double, handler: Double?) {
        guard connected else { return }
        let state = active.values.reduce(0) { $0 | (1 << $1) }
        var message: [String: Any] = ["type": "fingers", "state": state & 15, "thumb": (state & 16) != 0,
                                      "seq": sequence, "t": touch * 1_000]
        if let handler = handler { message["handlerAt"] = handler * 1_000 }
        sequence += 1
        message["screen"] = screenSnapshot()
        message["sentAt"] = clock.systemUptime * 1_000
        send(message)
    }

    private func screenSnapshot() -> [String: Any] {
        let touches: [[String: Any]] = positions.map { key, value in
            ["id": value.id, "x": value.point.x / bounds.width,
             "y": value.point.y / bounds.height,
             "finger": active[key].map { $0 as Any } ?? NSNull()]
        }
        return ["width": bounds.width, "height": bounds.height,
                "centers": centers.isEmpty ? NSNull() : centers.map { ["x": $0.x, "y": $0.y] } as Any,
                "touches": touches]
    }

    private func sendScreen() {
        guard connected, bounds.width > 0, bounds.height > 0 else { return }
        send(["type": "touches", "screen": screenSnapshot()])
    }

    private func sendTiming() {
        guard connected else { return }
        let sorted = arrivals.sorted { $0.value == $1.value ? $0.key < $1.key : $0.value < $1.value }
        let origin = sorted.first?.value ?? 0
        let records: [[String: Any]] = sorted.enumerated().map { index, entry in
            ["finger": names[entry.key], "timestamp": entry.value,
             "relativeMs": entry.value - origin, "order": index + 1]
        }
        send(["type": "timing", "measurement": ["arrivals": records,
              "totalSpreadMs": (sorted.last?.value ?? origin) - origin]])
    }
}
