import SafariServices
import Foundation

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
              let operation = message["operation"] as? String,
              let clientId = message["clientId"] as? String,
              clientId.range(of: "^[a-zA-Z0-9-]{16,80}$", options: .regularExpression) != nil,
              ["pair", "poll", "result"].contains(operation) else {
            reply(context, ["error": "Invalid native request"]); return
        }
        let key = "at-safari.token." + clientId
        var request = URLRequest(url: URL(string: "http://127.0.0.1:19848/extension/" + operation)!)
        request.httpMethod = "POST"
        request.timeoutInterval = 8
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if operation != "pair" {
            guard let token = UserDefaults.standard.string(forKey: key) else {
                reply(context, ["error": "Not paired. Ask your agent for a pairing code."]); return
            }
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }
        do { request.httpBody = try JSONSerialization.data(withJSONObject: message) }
        catch { reply(context, ["error": "Invalid message encoding"]); return }
        guard (request.httpBody?.count ?? 0) < 512000 else { reply(context, ["error": "Message too large"]); return }
        let sessionConfig = URLSessionConfiguration.ephemeral
        sessionConfig.connectionProxyDictionary = [:]
        let session = URLSession(configuration: sessionConfig)
        session.dataTask(with: request) { data, response, error in
            defer { session.finishTasksAndInvalidate() }
            guard error == nil, let data = data, data.count < 512000,
                  var result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
                self.reply(context, ["error": "Local bridge unavailable. Ask your agent to call safari_status."]); return
            }
            if operation == "pair", (response as? HTTPURLResponse)?.statusCode == 200,
               let token = result.removeValue(forKey: "token") as? String {
                UserDefaults.standard.set(token, forKey: key)
            }
            self.reply(context, result)
        }.resume()
    }
    private func reply(_ context: NSExtensionContext, _ value: [String: Any]) {
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: value]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
