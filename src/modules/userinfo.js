module.exports = function({ bot, knex, config, commands }) {
    /**
     * Display user informations from provided Discord user ID
     * @param {*} msg 
     * @param {*} args 
     * @param {*} thread 
     */
    async function InfosCmd(msg, args, thread) {
      const userIdToGet = args.userId || (thread && thread.user_id);
      if (!userIdToGet) return;
      const user = bot.users.get(userIdToGet);
      const utils = require('../utils');

      const mainGuilds = utils.getMainGuilds();
      const userGuildData = new Map();
      for (const guild of mainGuilds) {
        let member = guild.members.get(user.id);
    
        if (! member) {
          try {
            member = await bot.getRESTGuildMember(guild.id, user.id);
          } catch (e) {
            continue;
          }
        }
    
        if (member) {
          userGuildData.set(guild.id, { guild, member });
        }
      }
      for (const [guildId, guildData] of userGuildData.entries()) {

     
        const roles = guildData.member.roles.map(roleId => guildData.guild.roles.get(roleId)).filter(Boolean);
        var userInfo = (`${roles.map(r => r.name).join(', ')}`);
      }


      msg.channel.createMessage(`**User Information** ${user.id}: ${user.username}#${user.discriminator}\nhttps://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`)
      msg.channel.createMessage(`**User Roles** ${userInfo}`)
    }
  
    commands.addGlobalCommand('info', '<userId:userId>', InfosCmd);
    commands.addInboxThreadCommand('info', '[userId:userId]', InfosCmd);
  }