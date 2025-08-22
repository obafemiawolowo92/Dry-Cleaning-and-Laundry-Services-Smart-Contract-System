;; Service Management Contract
;; Manages pickup and delivery scheduling coordination

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-SERVICE-NOT-FOUND (err u101))
(define-constant ERR-INVALID-STATUS (err u102))
(define-constant ERR-INVALID-INPUT (err u103))

;; Data Variables
(define-data-var next-service-id uint u1)
(define-data-var total-services uint u0)

;; Data Maps
(define-map services
  { service-id: uint }
  {
    customer: principal,
    pickup-address: (string-ascii 200),
    delivery-address: (string-ascii 200),
    pickup-time: uint,
    delivery-time: uint,
    service-type: (string-ascii 50),
    status: (string-ascii 20),
    created-at: uint,
    completed-at: (optional uint),
    total-cost: uint,
    special-instructions: (string-ascii 500)
  }
)

(define-map customer-services
  { customer: principal }
  { service-count: uint, total-spent: uint }
)

(define-map service-providers
  { provider: principal }
  { active: bool, rating: uint, completed-services: uint }
)

;; Public Functions

;; Create a new service request
(define-public (create-service
  (pickup-address (string-ascii 200))
  (delivery-address (string-ascii 200))
  (pickup-time uint)
  (delivery-time uint)
  (service-type (string-ascii 50))
  (special-instructions (string-ascii 500))
  (total-cost uint))
  (let
    (
      (service-id (var-get next-service-id))
      (customer tx-sender)
    )
    ;; Input validation
    (asserts! (> (len pickup-address) u0) ERR-INVALID-INPUT)
    (asserts! (> (len delivery-address) u0) ERR-INVALID-INPUT)
    (asserts! (> pickup-time block-height) ERR-INVALID-INPUT)
    (asserts! (> delivery-time pickup-time) ERR-INVALID-INPUT)
    (asserts! (> total-cost u0) ERR-INVALID-INPUT)

    ;; Create service record
    (map-set services
      { service-id: service-id }
      {
        customer: customer,
        pickup-address: pickup-address,
        delivery-address: delivery-address,
        pickup-time: pickup-time,
        delivery-time: delivery-time,
        service-type: service-type,
        status: "pending",
        created-at: block-height,
        completed-at: none,
        total-cost: total-cost,
        special-instructions: special-instructions
      }
    )

    ;; Update customer statistics
    (match (map-get? customer-services { customer: customer })
      existing-data
        (map-set customer-services
          { customer: customer }
          {
            service-count: (+ (get service-count existing-data) u1),
            total-spent: (+ (get total-spent existing-data) total-cost)
          }
        )
      (map-set customer-services
        { customer: customer }
        { service-count: u1, total-spent: total-cost }
      )
    )

    ;; Update counters
    (var-set next-service-id (+ service-id u1))
    (var-set total-services (+ (var-get total-services) u1))

    (ok service-id)
  )
)

;; Update service status
(define-public (update-service-status (service-id uint) (new-status (string-ascii 20)))
  (let
    (
      (service-data (unwrap! (map-get? services { service-id: service-id }) ERR-SERVICE-NOT-FOUND))
    )
    ;; Only customer or authorized provider can update
    (asserts! (or (is-eq tx-sender (get customer service-data))
                  (is-authorized-provider tx-sender)) ERR-NOT-AUTHORIZED)

    ;; Validate status
    (asserts! (is-valid-status new-status) ERR-INVALID-STATUS)

    ;; Update service
    (map-set services
      { service-id: service-id }
      (merge service-data {
        status: new-status,
        completed-at: (if (is-eq new-status "completed")
                         (some block-height)
                         (get completed-at service-data))
      })
    )

    ;; Update provider stats if completed
    (if (is-eq new-status "completed")
      (update-provider-stats tx-sender)
      true
    )

    (ok true)
  )
)

;; Register service provider
(define-public (register-provider)
  (begin
    (map-set service-providers
      { provider: tx-sender }
      { active: true, rating: u5, completed-services: u0 }
    )
    (ok true)
  )
)

;; Rate service provider
(define-public (rate-provider (provider principal) (service-id uint) (rating uint))
  (let
    (
      (service-data (unwrap! (map-get? services { service-id: service-id }) ERR-SERVICE-NOT-FOUND))
      (provider-data (unwrap! (map-get? service-providers { provider: provider }) ERR-NOT-AUTHORIZED))
    )
    ;; Only customer can rate
    (asserts! (is-eq tx-sender (get customer service-data)) ERR-NOT-AUTHORIZED)
    ;; Valid rating range
    (asserts! (and (>= rating u1) (<= rating u5)) ERR-INVALID-INPUT)
    ;; Service must be completed
    (asserts! (is-eq (get status service-data) "completed") ERR-INVALID-STATUS)

    ;; Update provider rating (simple average for now)
    (let
      (
        (current-rating (get rating provider-data))
        (completed-count (get completed-services provider-data))
        (new-rating (/ (+ (* current-rating completed-count) rating) (+ completed-count u1)))
      )
      (map-set service-providers
        { provider: provider }
        (merge provider-data { rating: new-rating })
      )
    )

    (ok true)
  )
)

;; Read-only Functions

;; Get service details
(define-read-only (get-service (service-id uint))
  (map-get? services { service-id: service-id })
)

;; Get customer statistics
(define-read-only (get-customer-stats (customer principal))
  (map-get? customer-services { customer: customer })
)

;; Get provider information
(define-read-only (get-provider-info (provider principal))
  (map-get? service-providers { provider: provider })
)

;; Get total services count
(define-read-only (get-total-services)
  (var-get total-services)
)

;; Private Functions

;; Check if provider is authorized
(define-private (is-authorized-provider (provider principal))
  (match (map-get? service-providers { provider: provider })
    provider-data (get active provider-data)
    false
  )
)

;; Validate service status
(define-private (is-valid-status (status (string-ascii 20)))
  (or (is-eq status "pending")
      (is-eq status "confirmed")
      (is-eq status "picked-up")
      (is-eq status "in-progress")
      (is-eq status "ready")
      (is-eq status "out-for-delivery")
      (is-eq status "completed")
      (is-eq status "cancelled"))
)

;; Update provider statistics
(define-private (update-provider-stats (provider principal))
  (match (map-get? service-providers { provider: provider })
    provider-data
      (map-set service-providers
        { provider: provider }
        (merge provider-data {
          completed-services: (+ (get completed-services provider-data) u1)
        })
      )
    false
  )
)
