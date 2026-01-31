/**
 * 用户信息工具类（单例模式）
 * 功能：封装获取、缓存、更新用户信息的逻辑，支持过期自动失效
 */
class UserInfoManager {
  constructor() {
    // 单例模式，确保全局唯一实例
    if (UserInfoManager.instance) {
      return UserInfoManager.instance;
    }
    UserInfoManager.instance = this;
    
    // 缓存配置：用户信息有效期为 1 天（毫秒）
    this.CACHE_EXPIRE = 86400000;
    this.cacheKey = 'user_info_cache';
  }

  /**
   * 获取用户信息（优先从缓存读取，缓存失效则调用 API）
   * @param {boolean} forceRefresh - 是否强制刷新缓存
   * @returns {Promise<Object|null>} 用户信息对象或 null
   */
  async getUserInfo(forceRefresh = false) {
    // 1. 优先读取缓存
    if (!forceRefresh) {
      const cachedInfo = this.getCachedUserInfo();
      if (cachedInfo) {
        console.log('✅ 从缓存获取用户信息:', cachedInfo);
        return cachedInfo;
      }
    }

    // 2. 缓存失效或强制刷新，调用微信 API
    try {
      const res = await wx.getUserProfile({
        desc: '用于为您提供个性化服务',
      });

      // 3. 缓存新获取的用户信息
      this.setCachedUserInfo(res.userInfo);
      console.log('✅ 成功获取并缓存用户信息:', res.userInfo);
      return res.userInfo;
    } catch (error) {
      console.error('❌ 获取用户信息失败:', error);
      // 统一错误处理，可扩展埋点上报
      this.reportError('getUserInfo', error);
      return null;
    }
  }

  /**
   * 从本地缓存读取用户信息
   * @returns {Object|null} 缓存的用户信息或 null
   */
  getCachedUserInfo() {
    try {
      const cacheStr = wx.getStorageSync(this.cacheKey);
      if (!cacheStr) return null;

      const cache = JSON.parse(cacheStr);
      // 检查缓存是否过期
      if (Date.now() - cache.timestamp < this.CACHE_EXPIRE) {
        return cache.data;
      } else {
        console.log('⌛ 用户信息缓存已过期，将重新获取');
        this.clearCachedUserInfo();
        return null;
      }
    } catch (error) {
      console.error('❌ 读取用户信息缓存失败:', error);
      return null;
    }
  }

  /**
   * 将用户信息存入本地缓存
   * @param {Object} userInfo - 用户信息对象
   */
  setCachedUserInfo(userInfo) {
    try {
      const cache = {
        data: userInfo,
        timestamp: Date.now(),
      };
      wx.setStorageSync(this.cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.error('❌ 缓存用户信息失败:', error);
    }
  }

  /**
   * 清除用户信息缓存
   */
  clearCachedUserInfo() {
    try {
      wx.removeStorageSync(this.cacheKey);
      console.log('🗑️ 已清除用户信息缓存');
    } catch (error) {
      console.error('❌ 清除用户信息缓存失败:', error);
    }
  }

  /**
   * 错误上报（可扩展接入 Sentry 等监控平台）
   * @param {string} action - 触发错误的操作名
   * @param {Error} error - 错误对象
   */
  reportError(action, error) {
    // 这里可以接入错误监控平台
    console.warn('⚠️ 错误上报:', { action, message: error.message, stack: error.stack });
  }
}

// 导出单例实例
const userInfoManager = new UserInfoManager();
module.exports = { userInfoManager };
