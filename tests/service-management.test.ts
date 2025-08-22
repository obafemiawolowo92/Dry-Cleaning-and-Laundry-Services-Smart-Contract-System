import { describe, it, expect, beforeEach } from "vitest"

// Mock Clarity contract functions for testing
const mockContract = {
  services: new Map(),
  customerServices: new Map(),
  serviceProviders: new Map(),
  nextServiceId: 1,
  totalServices: 0,
  blockHeight: 1000,
  
  createService: function (
      pickupAddress,
      deliveryAddress,
      pickupTime,
      deliveryTime,
      serviceType,
      specialInstructions,
      totalCost,
      customer,
  ) {
    // Input validation
    if (!pickupAddress || pickupAddress.length === 0) return { error: "ERR-INVALID-INPUT" }
    if (!deliveryAddress || deliveryAddress.length === 0) return { error: "ERR-INVALID-INPUT" }
    if (pickupTime <= this.blockHeight) return { error: "ERR-INVALID-INPUT" }
    if (deliveryTime <= pickupTime) return { error: "ERR-INVALID-INPUT" }
    if (totalCost <= 0) return { error: "ERR-INVALID-INPUT" }
    
    const serviceId = this.nextServiceId
    
    // Create service record
    this.services.set(serviceId, {
      customer,
      pickupAddress,
      deliveryAddress,
      pickupTime,
      deliveryTime,
      serviceType,
      status: "pending",
      createdAt: this.blockHeight,
      completedAt: null,
      totalCost,
      specialInstructions,
    })
    
    // Update customer statistics
    const existing = this.customerServices.get(customer) || { serviceCount: 0, totalSpent: 0 }
    this.customerServices.set(customer, {
      serviceCount: existing.serviceCount + 1,
      totalSpent: existing.totalSpent + totalCost,
    })
    
    this.nextServiceId++
    this.totalServices++
    
    return { success: serviceId }
  },
  
  updateServiceStatus: function (serviceId, newStatus, updater) {
    const service = this.services.get(serviceId)
    if (!service) return { error: "ERR-SERVICE-NOT-FOUND" }
    
    // Authorization check
    const isCustomer = updater === service.customer
    const isProvider = this.serviceProviders.has(updater) && this.serviceProviders.get(updater).active
    if (!isCustomer && !isProvider) return { error: "ERR-NOT-AUTHORIZED" }
    
    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "picked-up",
      "in-progress",
      "ready",
      "out-for-delivery",
      "completed",
      "cancelled",
    ]
    if (!validStatuses.includes(newStatus)) return { error: "ERR-INVALID-STATUS" }
    
    // Update service
    service.status = newStatus
    if (newStatus === "completed") {
      service.completedAt = this.blockHeight
    }
    
    return { success: true }
  },
  
  registerProvider: function (provider) {
    this.serviceProviders.set(provider, {
      active: true,
      rating: 5,
      completedServices: 0,
    })
    return { success: true }
  },
  
  getService: function (serviceId) {
    return this.services.get(serviceId) || null
  },
  
  getCustomerStats: function (customer) {
    return this.customerServices.get(customer) || null
  },
}

describe("Service Management Contract", () => {
  beforeEach(() => {
    // Reset contract state
    mockContract.services.clear()
    mockContract.customerServices.clear()
    mockContract.serviceProviders.clear()
    mockContract.nextServiceId = 1
    mockContract.totalServices = 0
    mockContract.blockHeight = 1000
  })
  
  describe("create-service", () => {
    it("should create a new service successfully", () => {
      const result = mockContract.createService(
          "123 Main St",
          "456 Oak Ave",
          1100, // pickup time
          1200, // delivery time
          "dry-clean",
          "Handle with care",
          5000, // cost
          "customer1",
      )
      
      expect(result.success).toBe(1)
      
      const service = mockContract.getService(1)
      expect(service).toBeTruthy()
      expect(service.customer).toBe("customer1")
      expect(service.status).toBe("pending")
      expect(service.totalCost).toBe(5000)
    })
    
    it("should reject invalid pickup address", () => {
      const result = mockContract.createService(
          "", // empty address
          "456 Oak Ave",
          1100,
          1200,
          "dry-clean",
          "Handle with care",
          5000,
          "customer1",
      )
      
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
    
    it("should reject invalid time sequence", () => {
      const result = mockContract.createService(
          "123 Main St",
          "456 Oak Ave",
          1200, // pickup after delivery
          1100,
          "dry-clean",
          "Handle with care",
          5000,
          "customer1",
      )
      
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
    
    it("should update customer statistics", () => {
      mockContract.createService("123 Main St", "456 Oak Ave", 1100, 1200, "dry-clean", "", 5000, "customer1")
      mockContract.createService("789 Pine St", "321 Elm Ave", 1300, 1400, "wash", "", 3000, "customer1")
      
      const stats = mockContract.getCustomerStats("customer1")
      expect(stats.serviceCount).toBe(2)
      expect(stats.totalSpent).toBe(8000)
    })
  })
  
  describe("update-service-status", () => {
    beforeEach(() => {
      mockContract.createService("123 Main St", "456 Oak Ave", 1100, 1200, "dry-clean", "", 5000, "customer1")
      mockContract.registerProvider("provider1")
    })
    
    it("should allow customer to update status", () => {
      const result = mockContract.updateServiceStatus(1, "cancelled", "customer1")
      expect(result.success).toBe(true)
      
      const service = mockContract.getService(1)
      expect(service.status).toBe("cancelled")
    })
    
    it("should allow authorized provider to update status", () => {
      const result = mockContract.updateServiceStatus(1, "confirmed", "provider1")
      expect(result.success).toBe(true)
      
      const service = mockContract.getService(1)
      expect(service.status).toBe("confirmed")
    })
    
    it("should reject unauthorized updates", () => {
      const result = mockContract.updateServiceStatus(1, "confirmed", "unauthorized")
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
    
    it("should reject invalid status", () => {
      const result = mockContract.updateServiceStatus(1, "invalid-status", "customer1")
      expect(result.error).toBe("ERR-INVALID-STATUS")
    })
    
    it("should set completion time for completed services", () => {
      mockContract.updateServiceStatus(1, "completed", "provider1")
      
      const service = mockContract.getService(1)
      expect(service.status).toBe("completed")
      expect(service.completedAt).toBe(mockContract.blockHeight)
    })
  })
  
  describe("register-provider", () => {
    it("should register a new provider", () => {
      const result = mockContract.registerProvider("provider1")
      expect(result.success).toBe(true)
      
      const provider = mockContract.serviceProviders.get("provider1")
      expect(provider.active).toBe(true)
      expect(provider.rating).toBe(5)
      expect(provider.completedServices).toBe(0)
    })
  })
  
  describe("edge cases", () => {
    it("should handle non-existent service lookup", () => {
      const service = mockContract.getService(999)
      expect(service).toBeNull()
    })
    
    it("should handle non-existent customer stats", () => {
      const stats = mockContract.getCustomerStats("non-existent")
      expect(stats).toBeNull()
    })
    
    it("should handle zero cost service rejection", () => {
      const result = mockContract.createService(
          "123 Main St",
          "456 Oak Ave",
          1100,
          1200,
          "dry-clean",
          "",
          0,
          "customer1",
      )
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
  })
})
