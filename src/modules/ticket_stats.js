const { Channel } = require("eris");
const { user } = require("../bot");

module.exports = function({ bot, knex, config, commands }) {
    /**
     * Display ticket stats
     * @param {*} msg 
     * @param {*} args 
     * @param {*} thread 
     */
    function firstResponse(msg) {
        knex.raw(`SELECT AVG(ResponseTime) / 60 / 60
            FROM(
                SELECT *, ROW_NUMBER() OVER(ORDER BY ResponseTime) as row 
                FROM (
                    SELECT  (JulianDay(FirstMessage) - JulianDay(a.created_at))* 24 * 60 * 60 as ResponseTime, *
                        FROM thread_messages a 
                        INNER JOIN (SELECT thread_id, MIN(created_at) as FirstMessage, MAX(created_at) LastMessage FROM thread_messages WHERE message_type IN (4) GROUP BY thread_id) b
                        ON a.thread_id = b.thread_id
                    GROUP BY a.thread_id))
            WHERE row between ((SELECT COUNT(*) FROM threads)*.10) AND ((SELECT COUNT(*) FROM threads)*.90)`)
        .then(function(results) {
            results.forEach(resultRow => {
                for (let result of Object.keys(results)) {
                    msg.channel.createMessage(`Average First Response ${result[0]}`)
                }
                
            })
        })
    } 

    function closer(msg) {
        let closerStats = ''
        knex.raw(`SELECT (SELECT user_name FROM thread_messages b WHERE a.user_id = b.user_id LIMIT 10) as user, COUNT(*) FROM thread_messages a WHERE body like '!close%' GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 5`)
        .then(function(results) {
            msg.channel.createMessage('Top 5 Closers')
            results.forEach(resultRow => {
                closerStats = `${closerStats}\n${resultRow['user']} - ${resultRow['COUNT(*)']}`
                // msg.channel.createMessage(`${resultRow['user']} - ${resultRow['COUNT(*)']}`)
            });
            msg.channel.createMessage(closerStats)
        })
    }   

    function avgTickets(msg) {
        knex.raw(`SELECT AVG(UserCount)
        FROM(
            SELECT COUNT(*) UserCount
            FROM threads
            GROUP BY user_id
        )`).then(function(results) {
            results.forEach(resultRow => {
                msg.channel.createMessage(`Average Tickets Per User: ${resultRow['AVG(UserCount)']}`)
            })
        })
    }

    function avgCompletion(msg) {
        knex.raw(`SELECT AVG(CompletionTime) / 60 / 60
        FROM(
        SELECT *, ROW_NUMBER() OVER(ORDER BY CompletionTime) as row 
        FROM (
        SELECT  (JulianDay(LastMessage) - JulianDay(FirstMessage))* 24 * 60 * 60 as CompletionTime, *
        FROM thread_messages a 
        INNER JOIN (SELECT thread_id, MIN(created_at) as FirstMessage, MAX(created_at) LastMessage FROM thread_messages WHERE message_type IN (4) GROUP BY thread_id) b
         ON a.thread_id = b.thread_id
        GROUP BY a.thread_id))`).then(function(results) {
            results.forEach(resultRow => {
                console.log(Object.keys(results))
                msg.channel.createMessage(`Average Resolution Time: ${resultRow[0]}`)
            })
        })
    }

    function stats(msg, args, thread) {
        if (args['statType'] === 'closer') {
                closer(msg)
        }
        else if(args['statType'] === 'avgTickets') {
                avgTickets(msg)
        } else if (args['statType'] === 'firstResponse') {
            firstResponse(msg)
        } else if (args['statType'] === 'completion') {
            // avgCompletion(msg)
        }
        else {
            msg.channel.createMessage('**closer** - Top 5 ticket closers \n**avgTickets** - Average tickets over all users \n**firstResponse** - The average first response time \n')
        }
    }

    async function userStats(msg, args, thread) {
        let userId = args['userId'] || msg.member.user.id
        if (!userId) return;
        const user = bot.users.get(userId)
        var stats = [];


        /* User Ticket Interactions */
        var interactionsPromise =  await knex.count('id')
        .from('thread_messages')
        .where('message_type', '2')
        .orWhere('message_type', '4' )
        .orWhere('message_type', '6')
        .andWhere({
            'user_id': userId
        })
        .then(function(result) {
            result.forEach(function(value) {
                stats.push(value['count(`id`)']);
                // console.log('Interactions ' + value['count(`id`)'])
            })
        });

        /* User Closes */
        var closesPromise = await knex.count('id')
        .from('thread_messages')
        .where('body', 'like', '!close%')
        .andWhere({
            'user_id': userId
        })
        .andWhere('message_type', '6')
        .then(function(result) {
            result.forEach(function(value) {
                stats.push(value['count(`id`)']);
                // console.log('Tickets Closed ' + value['count(`id`)']);
            })
        
        });

        /* User Commands */
        var commandsPromise = await knex.count('id')
        .from('thread_messages')
        .where('message_type', '6')
        .andWhere('user_id', userId)
        .then(function(result) {
            result.forEach(function(value){
                stats.push(value['count(`id`)']);
            })
        });

        /* User Public Replies */
        var publicRepliesPromise = await knex.count('id')
        .from('thread_messages')
        .where('message_type', '4')
        .andWhere('user_id', userId)
        .then(function(result) {
            result.forEach(function(value) {
                stats.push(value['count(`id`)']);
            })
        
        });

        /* User Internal Comments */
        var internalCommentPromise = await knex.count('id')
        .from('thread_messages')
        .where('message_type', '2')
        .andWhere('user_id', userId)
        .then(function(result) {
            result.forEach(function(value) {
                stats.push(value['count(`id`)']);
            })
        
        });
        console.log(stats)

        /* Finished Output */
        var interactions = stats[3] + stats[4] + stats[2];
        msg.channel.createMessage(
            `**Ticket Stats for ${user.username}**\n\n`
            + `\t**Closes**: ${stats[1]}\n` 
            + `\t**Total Interactions**: ${interactions}\n`
            + `\t**Total Public Replies**: ${stats[3]}\n`
            + `\t**Total Internal Comments**: ${stats[4]}\n`
            + `\t**Total Commands**: ${stats[2]}`
            
        );

    }    

    commands.addGlobalCommand('stats', '<statType>', stats);
    commands.addGlobalCommand('userstats', '[userId:userId]', userStats);
}


